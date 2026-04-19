"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

type User = { _id: string; username: string };

export default function Home() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [username, setUsername] = useState("");

  async function loadUsers() {
    try {
      const res = await fetch("/api/users");
      if (!res.ok) {
        throw new Error(`Request failed: ${res.status}`);
      }
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Could not load users. Check MongoDB connection.");
      setUsers([]);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  async function login(chosen: string) {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: chosen }),
    });

    if (!res.ok) {
      toast.error("Username must be 3-24 chars (a-z, 0-9, _.-)");
      return;
    }

    toast.success(`Welcome ${chosen.toLowerCase()}`);
    router.push("/dashboard");
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col items-center px-4 py-10">
      <h1 className="mb-2 text-6xl uppercase tracking-wide">IronLog</h1>
      <p className="mb-8 text-zinc-400">Select your profile or create one instantly.</p>

      <div className="mb-8 grid w-full gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {users.map((user) => (
          <Card key={user._id} className="cursor-pointer p-4 transition hover:border-[#b9ff66]" onClick={() => login(user.username)}>
            <p className="text-lg">{user.username}</p>
          </Card>
        ))}
      </div>

      <Card className="w-full max-w-md p-4">
        <p className="mb-2 text-sm text-zinc-400">New username</p>
        <div className="flex gap-2">
          <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="e.g. amit_92" />
          <Button onClick={() => login(username)}>Start</Button>
        </div>
      </Card>
    </main>
  );
}
