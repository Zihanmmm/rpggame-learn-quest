"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

const ACCEPT_FORMATS = ".txt,.md,.pdf,.epub";

export default function NewProjectPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [text, setText] = useState("");
  const [inputMode, setInputMode] = useState<"article" | "book">("article");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const charCount = text.length;

  async function handleFileUpload(file: File) {
    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "文件解析失败");
        setUploading(false);
        return;
      }

      setText(data.text);
      setUploadedFile(file.name);

      // Auto-fill project name from filename if empty
      if (!name.trim()) {
        const baseName = file.name.replace(/\.[^.]+$/, "");
        setName(baseName);
      }
    } catch {
      setError("文件上传失败");
    } finally {
      setUploading(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
    // Reset so same file can be re-selected
    e.target.value = "";
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileUpload(file);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
  }

  async function handleSubmit() {
    if (!name.trim() || !text.trim() || loading) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), articleText: text, inputMode }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "创建失败");
        setLoading(false);
        return;
      }
      router.push(`/projects/${data.id}`);
    } catch {
      setError("网络错误");
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-4 py-16">
      <a
        href="/"
        className="mb-8 inline-flex items-center gap-1 text-sm text-gray-400 transition-colors hover:text-gray-700"
      >
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 19l-7-7 7-7"
          />
        </svg>
        返回
      </a>

      <h1 className="mb-2 text-3xl font-bold text-gray-900">新建项目</h1>
      <p className="mb-8 text-gray-500">
        {inputMode === "article"
          ? "输入项目名称并粘贴文章，开始生成 RPG 游戏"
          : "上传书籍文件或粘贴全文，按章节生成连续 RPG 游戏"}
      </p>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        {/* Mode Toggle */}
        <div className="mb-5 flex items-center gap-1 rounded-xl bg-gray-100 p-1">
          <button
            type="button"
            onClick={() => setInputMode("article")}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              inputMode === "article"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            文章模式
          </button>
          <button
            type="button"
            onClick={() => setInputMode("book")}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              inputMode === "book"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            书籍模式
          </button>
        </div>

        <label
          htmlFor="projectName"
          className="mb-2 block text-sm font-medium text-gray-700"
        >
          项目名称
        </label>
        <input
          id="projectName"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="例如：皇帝的新装"
          className="mb-5 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-800 placeholder-gray-400 transition-colors focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-400/30"
        />

        {/* File Upload Zone — shown in book mode */}
        {inputMode === "book" && (
          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              上传文件
            </label>
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => fileInputRef.current?.click()}
              className={`cursor-pointer rounded-xl border-2 border-dashed px-6 py-8 text-center transition-all ${
                uploading
                  ? "border-blue-300 bg-blue-50"
                  : uploadedFile
                    ? "border-emerald-300 bg-emerald-50"
                    : "border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50/50"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPT_FORMATS}
                onChange={handleFileChange}
                className="hidden"
              />

              {uploading ? (
                <div className="flex flex-col items-center gap-2">
                  <Spinner />
                  <p className="text-sm text-blue-600">正在解析文件...</p>
                </div>
              ) : uploadedFile ? (
                <div className="flex flex-col items-center gap-2">
                  <svg className="h-8 w-8 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm font-medium text-emerald-700">{uploadedFile}</p>
                  <p className="text-xs text-emerald-600">
                    已提取 {charCount.toLocaleString()} 字 · 点击重新上传
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                  <p className="text-sm text-gray-500">
                    拖拽文件到此处，或点击选择文件
                  </p>
                  <p className="text-xs text-gray-400">
                    支持 TXT、PDF、EPUB 格式（最大 50MB）
                  </p>
                </div>
              )}
            </div>

            {uploadedFile && (
              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs text-gray-400">
                  文件内容已填入下方文本框，可手动编辑
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setText("");
                    setUploadedFile(null);
                  }}
                  className="text-xs text-red-400 hover:text-red-600"
                >
                  清除
                </button>
              </div>
            )}
          </div>
        )}

        <label
          htmlFor="article"
          className="mb-2 block text-sm font-medium text-gray-700"
        >
          {inputMode === "article" ? "文章内容" : "书籍全文"}
        </label>
        <textarea
          id="article"
          rows={inputMode === "book" ? 20 : 14}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={inputMode === "article"
            ? "在此粘贴一篇文章、故事或任意文本..."
            : "在此粘贴书籍全文（包含章节标题），或通过上方上传文件自动填入..."
          }
          className="w-full resize-y rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-800 placeholder-gray-400 transition-colors focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-400/30"
        />

        <div className="mt-3 flex items-center justify-between text-sm text-gray-400">
          <span>{charCount.toLocaleString()} 字</span>
        </div>

        {error && (
          <p className="mt-3 text-sm text-red-500">{error}</p>
        )}

        <button
          onClick={handleSubmit}
          disabled={!name.trim() || !text.trim() || loading}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-emerald-500 px-6 py-3 font-semibold text-white shadow-md transition-all hover:from-blue-400 hover:to-emerald-400 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
        >
          {loading ? (
            <>
              <Spinner />
              创建中...
            </>
          ) : (
            "创建项目"
          )}
        </button>
      </div>
    </main>
  );
}

function Spinner() {
  return (
    <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}
