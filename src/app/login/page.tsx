"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { LayoutGrid } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Имэйл эсвэл нууц үг буруу байна.");
    } else {
      router.push("/products");
    }
  }

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Left panel */}
      <div className="hidden lg:flex w-1/2 bg-gray-950 flex-col justify-between p-12">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-500 rounded-xl flex items-center justify-center">
            <LayoutGrid size={18} className="text-white" />
          </div>
          <span className="text-white font-bold text-lg">VitaStore</span>
        </div>
        <div>
          <h1 className="text-4xl font-bold text-white leading-snug mb-4">
            Витамин бүтээгдэхүүний<br />бүртгэлийн систем
          </h1>
          <p className="text-gray-400 text-base">
            Австралиас Монголруу явуулж буй бүтээгдэхүүнийг хялбархан бүртгэж, удирдана уу.
          </p>
        </div>
        <p className="text-gray-600 text-sm">© 2025 VitaStore</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
              <LayoutGrid size={15} className="text-white" />
            </div>
            <span className="font-bold text-gray-900">VitaStore</span>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-1">Нэвтрэх</h2>
          <p className="text-gray-500 text-sm mb-8">Имэйл болон нууц үгээ оруулна уу</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-gray-700 font-medium text-sm">Имэйл</Label>
              <Input
                id="email"
                type="email"
                placeholder="example@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-gray-700 font-medium text-sm">Нууц үг</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11"
                required
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <Button type="submit" className="w-full h-11 text-sm font-medium" disabled={loading}>
              {loading ? "Нэвтэрч байна..." : "Нэвтрэх"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
