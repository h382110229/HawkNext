cmake_minimum_required(VERSION 3.21)

cmake_policy(SET CMP0091 NEW)
project(hawknext_native_ugrep LANGUAGES C CXX)

if(NOT MSVC)
  message(FATAL_ERROR "HawkNext Windows ugrep must be built with MSVC")
endif()

foreach(source_name UGREP PCRE2 ZLIB BZIP2 ZSTD BROTLI)
  if(NOT DEFINED HAWKNEXT_${source_name}_SOURCE_DIR)
    message(FATAL_ERROR "Missing HAWKNEXT_${source_name}_SOURCE_DIR")
  endif()
endforeach()

if(NOT DEFINED HAWKNEXT_UGREP_OUTPUT_DIR)
  message(FATAL_ERROR "Missing HAWKNEXT_UGREP_OUTPUT_DIR")
endif()

set(CMAKE_MSVC_RUNTIME_LIBRARY "MultiThreaded$<$<CONFIG:Debug>:Debug>")
set(BUILD_SHARED_LIBS OFF CACHE BOOL "" FORCE)
set(BUILD_TESTING OFF CACHE BOOL "" FORCE)

# 随机构建目录不能进入最终 PE，否则同版本工具无法跨 CLI 复用同一份 runtime cache。
if(DEFINED HAWKNEXT_BUILD_PATH)
  add_compile_options("/pathmap:${HAWKNEXT_BUILD_PATH}=hawknext-native-search")
endif()

set(BUILD_STATIC_LIBS ON CACHE BOOL "" FORCE)
set(PCRE2_BUILD_PCRE2_8 ON CACHE BOOL "" FORCE)
set(PCRE2_BUILD_PCRE2_16 OFF CACHE BOOL "" FORCE)
set(PCRE2_BUILD_PCRE2_32 OFF CACHE BOOL "" FORCE)
set(PCRE2_BUILD_PCRE2GREP OFF CACHE BOOL "" FORCE)
set(PCRE2_BUILD_TESTS OFF CACHE BOOL "" FORCE)
set(PCRE2_SHOW_REPORT OFF CACHE BOOL "" FORCE)
set(PCRE2_STATIC_RUNTIME ON CACHE BOOL "" FORCE)
set(PCRE2_SUPPORT_JIT ON CACHE BOOL "" FORCE)
add_subdirectory("${HAWKNEXT_PCRE2_SOURCE_DIR}" pcre2 EXCLUDE_FROM_ALL)

set(SKIP_INSTALL_ALL ON CACHE BOOL "" FORCE)
add_subdirectory("${HAWKNEXT_ZLIB_SOURCE_DIR}" zlib EXCLUDE_FROM_ALL)

add_library(hawknext_bzip2 STATIC
  "${HAWKNEXT_BZIP2_SOURCE_DIR}/blocksort.c"
  "${HAWKNEXT_BZIP2_SOURCE_DIR}/huffman.c"
  "${HAWKNEXT_BZIP2_SOURCE_DIR}/crctable.c"
  "${HAWKNEXT_BZIP2_SOURCE_DIR}/randtable.c"
  "${HAWKNEXT_BZIP2_SOURCE_DIR}/compress.c"
  "${HAWKNEXT_BZIP2_SOURCE_DIR}/decompress.c"
  "${HAWKNEXT_BZIP2_SOURCE_DIR}/bzlib.c"
)
target_compile_definitions(hawknext_bzip2 PRIVATE _CRT_SECURE_NO_WARNINGS)
target_include_directories(hawknext_bzip2 PUBLIC "${HAWKNEXT_BZIP2_SOURCE_DIR}")

set(ZSTD_BUILD_CONTRIB OFF CACHE BOOL "" FORCE)
set(ZSTD_BUILD_PROGRAMS OFF CACHE BOOL "" FORCE)
set(ZSTD_BUILD_SHARED OFF CACHE BOOL "" FORCE)
set(ZSTD_BUILD_STATIC ON CACHE BOOL "" FORCE)
set(ZSTD_BUILD_TESTS OFF CACHE BOOL "" FORCE)
set(ZSTD_USE_STATIC_RUNTIME ON CACHE BOOL "" FORCE)
add_subdirectory("${HAWKNEXT_ZSTD_SOURCE_DIR}/build/cmake" zstd EXCLUDE_FROM_ALL)

set(BROTLI_BUNDLED_MODE ON CACHE BOOL "" FORCE)
add_subdirectory("${HAWKNEXT_BROTLI_SOURCE_DIR}" brotli EXCLUDE_FROM_ALL)

set(HAWKNEXT_VIIZ_SOURCE_DIR "${HAWKNEXT_UGREP_SOURCE_DIR}/lzma/C")
add_library(hawknext_viiz STATIC
  "${HAWKNEXT_VIIZ_SOURCE_DIR}/viizip.c"
  "${HAWKNEXT_VIIZ_SOURCE_DIR}/7zAlloc.c"
  "${HAWKNEXT_VIIZ_SOURCE_DIR}/7zArcIn.c"
  "${HAWKNEXT_VIIZ_SOURCE_DIR}/7zBuf.c"
  "${HAWKNEXT_VIIZ_SOURCE_DIR}/7zBuf2.c"
  "${HAWKNEXT_VIIZ_SOURCE_DIR}/7zCrc.c"
  "${HAWKNEXT_VIIZ_SOURCE_DIR}/7zCrcOpt.c"
  "${HAWKNEXT_VIIZ_SOURCE_DIR}/7zDec.c"
  "${HAWKNEXT_VIIZ_SOURCE_DIR}/7zFile.c"
  "${HAWKNEXT_VIIZ_SOURCE_DIR}/7zStream.c"
  "${HAWKNEXT_VIIZ_SOURCE_DIR}/Bcj2.c"
  "${HAWKNEXT_VIIZ_SOURCE_DIR}/Bra.c"
  "${HAWKNEXT_VIIZ_SOURCE_DIR}/Bra86.c"
  "${HAWKNEXT_VIIZ_SOURCE_DIR}/BraIA64.c"
  "${HAWKNEXT_VIIZ_SOURCE_DIR}/CpuArch.c"
  "${HAWKNEXT_VIIZ_SOURCE_DIR}/Delta.c"
  "${HAWKNEXT_VIIZ_SOURCE_DIR}/Lzma2Dec.c"
  "${HAWKNEXT_VIIZ_SOURCE_DIR}/LzmaDec.c"
  "${HAWKNEXT_VIIZ_SOURCE_DIR}/Ppmd7.c"
  "${HAWKNEXT_VIIZ_SOURCE_DIR}/Ppmd7Dec.c"
)
target_compile_definitions(hawknext_viiz PRIVATE
  Z7_PPMD_SUPPORT
  Z7_EXTRACT_ONLY
  NDEBUG
  _CRT_SECURE_NO_WARNINGS
)
target_include_directories(hawknext_viiz PUBLIC "${HAWKNEXT_VIIZ_SOURCE_DIR}")

set(HAWKNEXT_REFLEX_SOURCES
  "${HAWKNEXT_UGREP_SOURCE_DIR}/lib/block_scripts.cpp"
  "${HAWKNEXT_UGREP_SOURCE_DIR}/lib/composer.cpp"
  "${HAWKNEXT_UGREP_SOURCE_DIR}/lib/convert.cpp"
  "${HAWKNEXT_UGREP_SOURCE_DIR}/lib/debug.cpp"
  "${HAWKNEXT_UGREP_SOURCE_DIR}/lib/error.cpp"
  "${HAWKNEXT_UGREP_SOURCE_DIR}/lib/input.cpp"
  "${HAWKNEXT_UGREP_SOURCE_DIR}/lib/language_scripts.cpp"
  "${HAWKNEXT_UGREP_SOURCE_DIR}/lib/letter_case.cpp"
  "${HAWKNEXT_UGREP_SOURCE_DIR}/lib/letter_scripts.cpp"
  "${HAWKNEXT_UGREP_SOURCE_DIR}/lib/matcher.cpp"
  "${HAWKNEXT_UGREP_SOURCE_DIR}/lib/pattern.cpp"
  "${HAWKNEXT_UGREP_SOURCE_DIR}/lib/posix.cpp"
  "${HAWKNEXT_UGREP_SOURCE_DIR}/lib/simd.cpp"
  "${HAWKNEXT_UGREP_SOURCE_DIR}/lib/unicode.cpp"
  "${HAWKNEXT_UGREP_SOURCE_DIR}/lib/utf8.cpp"
)

add_library(hawknext_reflex STATIC ${HAWKNEXT_REFLEX_SOURCES})
target_compile_definitions(hawknext_reflex PRIVATE WITH_NO_CODEGEN)

add_executable(ugrep
  "${HAWKNEXT_UGREP_SOURCE_DIR}/src/ugrep.cpp"
  "${HAWKNEXT_UGREP_SOURCE_DIR}/src/cnf.cpp"
  "${HAWKNEXT_UGREP_SOURCE_DIR}/src/glob.cpp"
  "${HAWKNEXT_UGREP_SOURCE_DIR}/src/output.cpp"
  "${HAWKNEXT_UGREP_SOURCE_DIR}/src/query.cpp"
  "${HAWKNEXT_UGREP_SOURCE_DIR}/src/screen.cpp"
  "${HAWKNEXT_UGREP_SOURCE_DIR}/src/stats.cpp"
  "${HAWKNEXT_UGREP_SOURCE_DIR}/src/vkey.cpp"
  "${HAWKNEXT_UGREP_SOURCE_DIR}/src/zopen.c"
)

add_library(hawknext_ugrep_contract INTERFACE)
target_compile_definitions(hawknext_ugrep_contract INTERFACE
  HAVE_LIBBROTLI
  HAVE_LIBBZ2
  HAVE_LIBZ
  HAVE_LIBZSTD
  HAVE_PCRE2
  NDEBUG
  PCRE2_STATIC
  WITH_COLOR
  WITH_NO_INDENT
  _CONSOLE
  _CRT_NONSTDC_NO_WARNINGS
  _CRT_SECURE_NO_WARNINGS
)
if(CMAKE_GENERATOR_PLATFORM STREQUAL "ARM64")
  target_compile_definitions(hawknext_ugrep_contract INTERFACE HAVE_NEON)
else()
  target_compile_definitions(hawknext_ugrep_contract INTERFACE HAVE_SSE2)
endif()
target_compile_features(hawknext_ugrep_contract INTERFACE cxx_std_17)
# ugrep 固定源码是无 BOM UTF-8；中文 Windows 按 CP936 解析时会触发 C4819/C1070，并改写 UTF-8 字符串字面量。
target_compile_options(hawknext_ugrep_contract INTERFACE
  /utf-8
  $<$<COMPILE_LANGUAGE:CXX>:/EHsc>
)
target_include_directories(hawknext_ugrep_contract INTERFACE
  "${HAWKNEXT_UGREP_SOURCE_DIR}/include"
  "${HAWKNEXT_UGREP_SOURCE_DIR}/src"
  "${HAWKNEXT_VIIZ_SOURCE_DIR}"
)

target_link_libraries(hawknext_reflex PRIVATE hawknext_ugrep_contract pcre2-8-static)
target_link_libraries(ugrep PRIVATE
  hawknext_ugrep_contract
  hawknext_reflex
  hawknext_viiz
  pcre2-8-static
  zlibstatic
  hawknext_bzip2
  libzstd_static
  brotlienc
  brotlidec
  brotlicommon
)
target_link_options(ugrep PRIVATE /Brepro)
set_target_properties(ugrep PROPERTIES
  RUNTIME_OUTPUT_DIRECTORY "${HAWKNEXT_UGREP_OUTPUT_DIR}"
  RUNTIME_OUTPUT_DIRECTORY_RELEASE "${HAWKNEXT_UGREP_OUTPUT_DIR}"
)
