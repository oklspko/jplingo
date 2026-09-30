package com.jplingo.app;

import android.os.StatFs;
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
    /** APK 内置模型所在的 assets 目录（CI 把 7 个模型文件放这里） */
    private static final String BUNDLED_DIR = "tts-ja";
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

    /** APK 是否内置了完整模型（assets/tts-ja 下 7 个文件齐全） */
    private boolean bundledComplete() {
        java.util.List<String> names = java.util.Arrays.asList(bundledFiles());
        for (String name : MODEL_FILES) {
            if (!names.contains(name)) return false;
        }
        return true;
    }

    private String[] bundledFiles() {
        try {
            String[] names = getContext().getAssets().list(BUNDLED_DIR);
            return names == null ? new String[0] : names;
        } catch (Exception e) {
            return new String[0];
        }
    }

    /**
     * 模型是否**现在就能用**（前端据此决定是否走内置引擎）。
     * ready = filesDir 里那份齐全（下载的或已从内置拷过来的）；
     * bundled 只说明 APK 内置了模型，前端据此触发一次拷贝——注意此时还不能算 ready，
     * 因为 initTts() 是从 filesDir 读模型，报 ready=true 会让每次合成都找不到文件。
     */
    @PluginMethod
    public void isReady(PluginCall call) {
        JSObject ret = new JSObject();
        boolean downloaded = modelComplete();
        ret.put("ready", downloaded);
        ret.put("downloaded", downloaded);
        ret.put("bundled", bundledComplete());
        ret.put("modelDir", modelDir().getAbsolutePath());
        call.resolve(ret);
    }

    /**
     * 把 APK 内置的模型（assets/tts-ja/*）拷到 filesDir/tts-ja。
     * 装机即有的路径：不走网络，只是本地一次拷贝，比让用户在手机上拉 123MB 稳得多。
     */
    @PluginMethod
    public void installFromAssets(final PluginCall call) {
        new Thread(
            () -> {
                try {
                    if (modelComplete()) {
                        JSObject done = new JSObject();
                        done.put("ok", true);
                        done.put("already", true);
                        call.resolve(done);
                        return;
                    }
                    if (!bundledComplete()) {
                        call.reject("APK 未内置离线语音模型");
                        return;
                    }
                    // 内置模型解压后约 145MB，拷贝期间不会同时留压缩包，留点余量即可
                    long need = 170L * 1024 * 1024;
                    StatFs stat = new StatFs(getContext().getFilesDir().getAbsolutePath());
                    long free = stat.getAvailableBytes();
                    if (free < need) {
                        call.reject(
                            String.format(
                                "存储空间不足：内置语音需要约 %d MB，当前可用 %d MB",
                                need / 1024 / 1024,
                                free / 1024 / 1024
                            )
                        );
                        return;
                    }
                    File dir = modelDir();
                    if (!dir.exists() && !dir.mkdirs()) {
                        throw new Exception("无法创建模型目录");
                    }
                    int count = 0;
                    for (String name : MODEL_FILES) {
                        try (
                            InputStream in = getContext().getAssets().open(BUNDLED_DIR + "/" + name);
                            OutputStream out = new FileOutputStream(new File(dir, name))
                        ) {
                            copy(in, out);
                        }
                        count++;
                    }
                    if (!modelComplete()) {
                        call.reject("内置语音拷贝后文件不完整");
                        return;
                    }
                    JSObject ret = new JSObject();
                    ret.put("ok", true);
                    ret.put("files", count);
                    call.resolve(ret);
                } catch (Throwable e) {
                    Log.e(TAG, "installFromAssets failed", e);
                    call.reject("内置语音准备失败：" + e.getMessage());
                }
            },
            "JpTts-assets"
        ).start();
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
                    // 空间预检：解压期间「压缩包 + 解压产物」同时存在（实测 123MB 包解压后 145MB），
                    // 空间不够时直接给明确提示，而不是让 bz2 解到一半报一句「解压失败」。
                    long need = (long) (archive.length() * 2.2) + 8L * 1024 * 1024;
                    StatFs stat = new StatFs(getContext().getFilesDir().getAbsolutePath());
                    long free = stat.getAvailableBytes();
                    if (free < need) {
                        call.reject(
                            String.format(
                                "存储空间不足：解压需要约 %d MB，当前可用 %d MB",
                                need / 1024 / 1024,
                                free / 1024 / 1024
                            )
                        );
                        return;
                    }
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
        // 扩散步数：前端可在「我的」页调（越少越快），缺省 8 保持与之前一致
        Integer stepsArg = call.getInt("steps");
        final int steps = stepsArg == null ? 8 : Math.max(1, stepsArg);

        new Thread(
            () -> {
                try {
                    initTts();
                    GenerationConfig gen = new GenerationConfig();
                    gen.setSid(sid);
                    gen.setNumSteps(steps);
                    gen.setSpeed(speed);
                    // 官方 AAR 的 setExtra 收 Map<String, String>（早期 Java 版才是 JSON 字符串）
                    Map<String, String> extra = new HashMap<>();
                    extra.put("lang", "ja");
                    gen.setExtra(extra);
                    GeneratedAudio audio = tts.generateWithConfig(text, gen);
                    float[] samples = audio.getSamples();
                    if (samples == null || samples.length == 0) {
                        // 0 采样时 save() 仍会写个几十字节的 WAV 头，前端播出来是「静默」而不是报错
                        call.reject("合成结果为空（0 采样），这段文本可能不被支持");
                        return;
                    }
                    File cacheDir = new File(getContext().getCacheDir(), "tts");
                    if (!cacheDir.exists()) cacheDir.mkdirs();
                    // 文件名要带 steps：换了步数就是另一份音频，否则会命中旧参数的 WAV
                    File out =
                        new File(cacheDir, md5(text + "|" + sid + "|" + speed + "|" + steps) + ".wav");
                    if (!audio.save(out.getAbsolutePath())) {
                        call.reject("音频写入失败");
                        return;
                    }
                    JSObject ret = new JSObject();
                    ret.put("path", out.getAbsolutePath());
                    // 音频时长回报给前端：配合前端测的合成耗时，手机上就能算出真实 RTF
                    ret.put("duration", samples.length / (double) audio.getSampleRate());
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
