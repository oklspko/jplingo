package com.jplingo.app;

import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.k2fsa.sherpa.onnx.GeneratedAudio;
import com.k2fsa.sherpa.onnx.GenerationConfig;
import com.k2fsa.sherpa.onnx.OfflineTts;
import com.k2fsa.sherpa.onnx.OfflineTtsConfig;
import com.k2fsa.sherpa.onnx.OfflineTtsModelConfig;
import com.k2fsa.sherpa.onnx.OfflineTtsSupertonicModelConfig;

import org.apache.commons.compress.archivers.tar.TarArchiveEntry;
import org.apache.commons.compress.archivers.tar.TarArchiveInputStream;
import org.apache.commons.compress.compressors.bzip2.BZip2CompressorInputStream;

import java.io.BufferedInputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.security.MessageDigest;
import java.util.HashMap;
import java.util.Map;

/**
 * 离线日语发音引擎（sherpa-onnx + Supertonic-3 int8）。
 *
 * - 运行时（libonnxruntime.so / libsherpa-onnx-jni.so）随 APK 一起打包（仅 arm64-v8a）；
 * - 语言模型约 123MB，不打进 APK，由前端下载到 Directory.Data 后调用 installModel() 解压；
 * - speak() 合成 WAV 到 cacheDir/tts/，返回绝对路径，前端用 Capacitor.convertFileSrc 播放。
 */
@CapacitorPlugin(name = "JpTts")
public class JpTtsPlugin extends Plugin {

    private static final String TAG = "JpTts";
    private static final String MODEL_DIR = "tts-ja";
    private static final String[] MODEL_FILES = {
        "duration_predictor.int8.onnx",
        "text_encoder.int8.onnx",
        "vector_estimator.int8.onnx",
        "vocoder.int8.onnx",
        "tts.json",
        "unicode_indexer.bin",
        "voice.bin",
    };

    private volatile OfflineTts tts = null;

    private File modelDir() {
        return new File(getContext().getFilesDir(), MODEL_DIR);
    }

    private boolean modelComplete() {
        File dir = modelDir();
        for (String name : MODEL_FILES) {
            if (!new File(dir, name).isFile()) return false;
        }
        return true;
    }

    /** 模型是否已就绪（前端据此决定是否走内置引擎） */
    @PluginMethod
    public void isReady(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("ready", modelComplete());
        ret.put("modelDir", modelDir().getAbsolutePath());
        call.resolve(ret);
    }

    /** 解压已下载到 filesDir 的 .tar.bz2 模型包 */
    @PluginMethod
    public void installModel(final PluginCall call) {
        final String archiveName = call.getString("archive", "tts-model.tar.bz2");
        new Thread(
            () -> {
                File archive = new File(getContext().getFilesDir(), archiveName);
                if (!archive.isFile()) {
                    call.reject("模型包不存在：" + archive.getAbsolutePath());
                    return;
                }
                File dir = modelDir();
                try {
                    if (!dir.exists() && !dir.mkdirs()) {
                        throw new Exception("无法创建模型目录");
                    }
                    int count = 0;
                    try (
                        InputStream fileIn = new BufferedInputStream(new FileInputStream(archive));
                        BZip2CompressorInputStream bzIn = new BZip2CompressorInputStream(fileIn);
                        TarArchiveInputStream tarIn = new TarArchiveInputStream(bzIn)
                    ) {
                        TarArchiveEntry entry;
                        while ((entry = tarIn.getNextTarEntry()) != null) {
                            if (entry.isDirectory()) continue;
                            String name = entry.getName();
                            // 去掉压缩包内的顶层目录名
                            int slash = name.indexOf('/');
                            String rel = slash >= 0 ? name.substring(slash + 1) : name;
                            if (rel.isEmpty() || rel.startsWith(".")) continue;
                            File out = new File(dir, rel);
                            File parent = out.getParentFile();
                            if (parent != null && !parent.exists()) parent.mkdirs();
                            try (OutputStream outStream = new FileOutputStream(out)) {
                                copy(tarIn, outStream);
                            }
                            count++;
                        }
                    }
                    archive.delete();
                    if (!modelComplete()) {
                        call.reject("模型解压后文件不完整");
                        return;
                    }
                    JSObject ret = new JSObject();
                    ret.put("ok", true);
                    ret.put("files", count);
                    call.resolve(ret);
                } catch (Exception e) {
                    Log.e(TAG, "installModel failed", e);
                    call.reject("模型解压失败：" + e.getMessage());
                }
            },
            "JpTts-install"
        ).start();
    }

    /**
     * 加载模型。加锁：前端可能连点发音 / 同时触发 prepare 与 speak，
     * 并发进入会各自 new 一个 OfflineTts（内存翻倍、句柄泄漏）。
     */
    private synchronized void initTts() throws Exception {
        if (tts != null) return;
        File dir = modelDir();
        OfflineTtsSupertonicModelConfig supertonic = new OfflineTtsSupertonicModelConfig();
        supertonic.setDurationPredictor(new File(dir, MODEL_FILES[0]).getAbsolutePath());
        supertonic.setTextEncoder(new File(dir, MODEL_FILES[1]).getAbsolutePath());
        supertonic.setVectorEstimator(new File(dir, MODEL_FILES[2]).getAbsolutePath());
        supertonic.setVocoder(new File(dir, MODEL_FILES[3]).getAbsolutePath());
        supertonic.setTtsJson(new File(dir, MODEL_FILES[4]).getAbsolutePath());
        supertonic.setUnicodeIndexer(new File(dir, MODEL_FILES[5]).getAbsolutePath());
        supertonic.setVoiceStyle(new File(dir, MODEL_FILES[6]).getAbsolutePath());

        OfflineTtsModelConfig modelConfig = new OfflineTtsModelConfig();
        modelConfig.setSupertonic(supertonic);
        modelConfig.setNumThreads(2);
        modelConfig.setDebug(false);

        OfflineTtsConfig config = new OfflineTtsConfig();
        config.setModel(modelConfig);

        // 官方 Android AAR 的 Kotlin 构造签名是 (AssetManager, OfflineTtsConfig)：
        // 传 null 表示从文件路径加载模型（模型由前端下载到 filesDir，不在 assets 里）
        tts = new OfflineTts(null, config);
    }

    /** 预热：加载模型（首次约需数百毫秒～数秒），失败不抛给前端也能用 */
    @PluginMethod
    public void prepare(final PluginCall call) {
        if (!modelComplete()) {
            call.reject("模型未安装");
            return;
        }
        new Thread(
            () -> {
                try {
                    initTts();
                    JSObject ret = new JSObject();
                    ret.put("ok", true);
                    call.resolve(ret);
                } catch (Throwable e) {
                    Log.e(TAG, "prepare failed", e);
                    call.reject("TTS 初始化失败：" + e.getMessage());
                }
            },
            "JpTts-prepare"
        ).start();
    }

    /** 合成一句话，返回 WAV 绝对路径 */
    @PluginMethod
    public void speak(final PluginCall call) {
        final String text = call.getString("text");
        if (text == null || text.isEmpty()) {
            call.reject("text 不能为空");
            return;
        }
        if (!modelComplete()) {
            call.reject("模型未安装");
            return;
        }
        Float speedArg = call.getFloat("speed");
        final float speed = speedArg == null ? 1.0f : speedArg;
        Integer sidArg = call.getInt("sid");
        final int sid = sidArg == null ? 0 : sidArg;

        new Thread(
            () -> {
                try {
                    initTts();
                    GenerationConfig gen = new GenerationConfig();
                    gen.setSid(sid);
                    gen.setNumSteps(8);
                    gen.setSpeed(speed);
                    // 官方 AAR 的 setExtra 收 Map<String, String>（早期 Java 版才是 JSON 字符串）
                    Map<String, String> extra = new HashMap<>();
                    extra.put("lang", "ja");
                    gen.setExtra(extra);
                    GeneratedAudio audio = tts.generateWithConfig(text, gen);
                    File cacheDir = new File(getContext().getCacheDir(), "tts");
                    if (!cacheDir.exists()) cacheDir.mkdirs();
                    File out = new File(cacheDir, md5(text + "|" + sid + "|" + speed) + ".wav");
                    if (!audio.save(out.getAbsolutePath())) {
                        call.reject("音频写入失败");
                        return;
                    }
                    JSObject ret = new JSObject();
                    ret.put("path", out.getAbsolutePath());
                    call.resolve(ret);
                } catch (Throwable e) {
                    Log.e(TAG, "speak failed", e);
                    call.reject("合成失败：" + e.getMessage());
                }
            },
            "JpTts-speak"
        ).start();
    }

    @PluginMethod
    public void release(PluginCall call) {
        try {
            if (tts != null) {
                tts.release();
                tts = null;
            }
            call.resolve();
        } catch (Throwable e) {
            call.reject("释放失败：" + e.getMessage());
        }
    }

    private static void copy(InputStream in, OutputStream out) throws Exception {
        byte[] buf = new byte[8192];
        int n;
        while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
    }

    private static String md5(String s) throws Exception {
        MessageDigest md = MessageDigest.getInstance("MD5");
        byte[] digest = md.digest(s.getBytes("UTF-8"));
        StringBuilder sb = new StringBuilder();
        for (byte b : digest) sb.append(String.format("%02x", b));
        return sb.toString();
    }
}
