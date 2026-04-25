"use client";

import { useRouter } from "next/navigation";

export default function BackButton() {
  const router = useRouter();

  return (
    <button
      className="mt-8 bg-[#00aaff] text-black px-6 py-3 rounded-lg hover:bg-[#0088cc] transition"
      onClick={() => router.back()}
    >
      返回用户中心
    </button>
  );
}