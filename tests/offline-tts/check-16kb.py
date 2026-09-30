"""检查 APK 里 arm64 native 库的 16KB 页兼容性（Android 15+ 的 16KB 页设备要求）。

两件事都要满足，否则新手机上 dlopen 会失败 → 离线引擎直接没声音：
  1) ELF 的 PT_LOAD 段 p_align 必须是 16384（4KB 对齐的 .so 在 16KB 页内核上 mmap 会失败）
  2) 若 extractNativeLibs=false（直接从 APK mmap），zip 里 .so 的数据偏移也要 16KB 对齐

用法：python check-16kb.py <apk>
"""
import struct
import sys
import zipfile


def elf_alignments(data: bytes):
    if data[:4] != b"\x7fELF":
        return None
    is64 = data[4] == 2
    little = data[5] == 1
    endian = "<" if little else ">"
    if is64:
        e_phoff = struct.unpack_from(endian + "Q", data, 0x20)[0]
        e_phentsize = struct.unpack_from(endian + "H", data, 0x36)[0]
        e_phnum = struct.unpack_from(endian + "H", data, 0x38)[0]
        aligns = []
        for i in range(e_phnum):
            off = e_phoff + i * e_phentsize
            p_type = struct.unpack_from(endian + "I", data, off)[0]
            p_align = struct.unpack_from(endian + "Q", data, off + 0x30)[0]
            if p_type == 1:  # PT_LOAD
                aligns.append(p_align)
        return aligns
    e_phoff = struct.unpack_from(endian + "I", data, 0x1C)[0]
    e_phentsize = struct.unpack_from(endian + "H", data, 0x2A)[0]
    e_phnum = struct.unpack_from(endian + "H", data, 0x2C)[0]
    aligns = []
    for i in range(e_phnum):
        off = e_phoff + i * e_phentsize
        p_type = struct.unpack_from(endian + "I", data, off)[0]
        p_align = struct.unpack_from(endian + "I", data, off + 0x1C)[0]
        if p_type == 1:
            aligns.append(p_align)
    return aligns


def zip_data_offset(zf: zipfile.ZipFile, info: zipfile.ZipInfo) -> int:
    with open(zf.filename, "rb") as f:
        f.seek(info.header_offset)
        raw = f.read(30)
    name_len, extra_len = struct.unpack_from("<HH", raw, 26)
    return info.header_offset + 30 + name_len + extra_len


def main():
    apk = sys.argv[1]
    with zipfile.ZipFile(apk) as zf:
        names = [n for n in zf.namelist() if n.startswith("lib/") and n.endswith(".so")]
        print(f"{apk}\n共 {len(names)} 个 .so\n")
        bad = 0
        for name in sorted(names):
            info = zf.getinfo(name)
            data = zf.read(name)
            aligns = elf_alignments(data)
            off = zip_data_offset(zf, info)
            stored = info.compress_type == zipfile.ZIP_STORED
            elf_ok = bool(aligns) and all(a % 16384 == 0 for a in aligns)
            zip_ok = (not stored) or off % 16384 == 0
            flag = "OK " if (elf_ok and zip_ok) else "!! "
            if not (elf_ok and zip_ok):
                bad += 1
            print(
                f"  {flag}{name:<46} ELF p_align={aligns} zip偏移%16K={off % 16384:<6} "
                f"{'stored' if stored else 'deflate'}"
            )
        # 清单里 extractNativeLibs 的取值决定要不要看 zip 对齐
        manifest = zf.read("AndroidManifest.xml")
        print("\n  extractNativeLibs 出现在清单里:", b"extractNativeLibs" in manifest)
        if b"extractNativeLibs" in manifest:
            idx = manifest.find(b"extractNativeLibs")
            print("  清单片段:", manifest[max(0, idx - 8): idx + 40])
        print(f"\n不达标的库：{bad} 个")
        return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
