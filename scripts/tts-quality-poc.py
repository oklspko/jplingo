#!/usr/bin/env python3
"""离线日语 TTS 音质/延迟 PoC：用与安卓插件相同的参数在本机合成 WAV。

用途：挑音色（sid 0-9）、权衡 num_steps（延迟 vs 质量）、确认 lang=ja 出来的确实是日语。
参数刻意与 android/app/src/main/java/com/jplingo/app/JpTtsPlugin.java 对齐：
num_threads=2、num_steps=8、extra.lang=ja、speed=1.0。

准备（一次性，约 400MB）：
    python -m venv .tmp-tts-poc/venv
    .tmp-tts-poc/venv/Scripts/python -m pip install -i https://pypi.tuna.tsinghua.edu.cn/simple sherpa-onnx numpy
    # 模型（123MB，与 App 下载的是同一个包）
    curl -L -o model.tar.bz2 https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/sherpa-onnx-supertonic-3-tts-int8-2026-05-11.tar.bz2
    python -c "import tarfile;tarfile.open('model.tar.bz2','r:bz2').extractall('.')"

运行：
    python scripts/tts-quality-poc.py [模型目录] [输出目录]

2026-10-01 实测（本机桌面 CPU）：采样率 44100、语者 10 个；26 字句音频 3.79s / 合成 1.46s（RTF 0.38）；
App 里最长的 66 字句音频 11.17s / 合成 3.56s（RTF 0.32，steps=6 → 2.78s，steps=4 → 2.00s）。
"""
import json
import os
import sys
import time
import wave

import numpy as np
import sherpa_onnx

MODEL_DIR = sys.argv[1] if len(sys.argv) > 1 else "sherpa-onnx-supertonic-3-tts-int8-2026-05-11"
OUT_DIR = sys.argv[2] if len(sys.argv) > 2 else "tts-samples"
MANIFEST = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "public", "audio", "manifest.json")


def build_tts():
    def p(name):
        return os.path.join(MODEL_DIR, name)

    cfg = sherpa_onnx.OfflineTtsConfig(
        model=sherpa_onnx.OfflineTtsModelConfig(
            supertonic=sherpa_onnx.OfflineTtsSupertonicModelConfig(
                duration_predictor=p("duration_predictor.int8.onnx"),
                text_encoder=p("text_encoder.int8.onnx"),
                vector_estimator=p("vector_estimator.int8.onnx"),
                vocoder=p("vocoder.int8.onnx"),
                tts_json=p("tts.json"),
                unicode_indexer=p("unicode_indexer.bin"),
                voice_style=p("voice.bin"),
            ),
            num_threads=2,
            debug=False,
            provider="cpu",
        ),
    )
    return sherpa_onnx.OfflineTts(cfg)


def save_wav(path, samples, sample_rate):
    pcm = np.clip(np.asarray(samples, dtype=np.float32), -1.0, 1.0)
    pcm16 = (pcm * 32767.0).astype(np.int16)
    with wave.open(path, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sample_rate)
        w.writeframes(pcm16.tobytes())


def speak(tts, text, sid, out_name, num_steps=8, speed=1.0):
    gen = sherpa_onnx.GenerationConfig()
    gen.sid = sid
    gen.num_steps = num_steps
    gen.speed = speed
    gen.extra["lang"] = "ja"
    t0 = time.time()
    audio = tts.generate(text, gen)
    elapsed = time.time() - t0
    samples = np.asarray(audio.samples, dtype=np.float32)
    duration = len(samples) / float(audio.sample_rate)
    rms = float(np.sqrt(np.mean(samples**2))) if len(samples) else 0.0
    save_wav(os.path.join(OUT_DIR, out_name), samples, audio.sample_rate)
    print(
        f"  sid={sid} steps={num_steps:>2} speed={speed} | {len(text):>3} 字 | "
        f"音频 {duration:6.2f}s | 合成 {elapsed:6.2f}s | RTF {elapsed / duration:5.2f} | RMS {rms:.4f} | {out_name}"
    )


def longest_manifest_sentence(min_len=30):
    """App 真实清单里最长的一条假名句子（真机最吃力的场景）"""
    try:
        with open(MANIFEST, encoding="utf-8") as f:
            keys = list(json.load(f).keys())
        candidates = sorted((k for k in keys if len(k) >= min_len), key=len, reverse=True)
        if candidates:
            return candidates[0]
    except Exception as e:  # noqa: BLE001
        print(f"（读 manifest 失败：{e}）", file=sys.stderr)
    return "これはじっさいのアプリにないぶんしょうです"


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    t0 = time.time()
    tts = build_tts()
    print(f"模型加载 {time.time() - t0:.2f}s；采样率 {tts.sample_rate}；语者数 {tts.num_speakers}")

    print("\n[1] 不同语者（同一句话，sid 0-4）——挑音色用")
    for sid in range(5):
        speak(tts, "こんにちは、にほんごのべんきょうをがんばりましょう。", sid, f"voice-sid{sid}.wav")

    long_text = longest_manifest_sentence()
    print(f"\n[2] App 里最长的真实句子（{len(long_text)} 字），num_steps 8 / 6 / 4 看延迟")
    for steps in (8, 6, 4):
        speak(tts, long_text, 0, f"long-steps{steps}.wav", num_steps=steps)

    print("\n[3] 语速 speed 0.8 / 1.0 / 1.25（学习场景可能想放慢）")
    for speed in (0.8, 1.0, 1.25):
        speak(tts, "わたしはまいあさしちじにおきます。", 0, f"speed-{speed}.wav", speed=speed)

    print(f"\n输出目录：{os.path.abspath(OUT_DIR)}")


if __name__ == "__main__":
    main()
