"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

export default function Home() {
  const [tab, setTab] = useState<"login" | "register">("login");
  const [loginUser, setLoginUser] = useState("");
  const [loginPwd, setLoginPwd] = useState("");
  const [regUser, setRegUser] = useState("");
  const [regPwd, setRegPwd] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regCode, setRegCode] = useState("");
  const [hpWebsite, setHpWebsite] = useState("");
  const [hpNickname, setHpNickname] = useState("");
  const [sendingCode, setSendingCode] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [tip, setTip] = useState({ show: false, text: "" });
  const router = useRouter();

  const inputClass =
    "glass-input rounded-2xl px-4 py-3 text-[15px] placeholder:text-slate-500/70";
  const tabClass = (active: boolean) =>
    `glass-nav-tab flex-1 py-3 text-lg border-b-2 transition ${
      active ? "border-transparent" : "border-transparent"
    }`;

  const showTip = (text: string) => setTip({ show: true, text });
  const closeTip = () => setTip({ show: false, text: "" });

  const handleSendCode = async () => {
    if (!regEmail) return showTip("请先填写QQ邮箱！");
    if (!/^[A-Za-z0-9._%+-]+@qq\.com$/i.test(regEmail)) {
      return showTip("请填写有效的QQ邮箱！");
    }

    setSendingCode(true);
    try {
      const res = await api.sendRegisterCode(regEmail, hpWebsite, hpNickname);
      const data = await res.json();
      if (!res.ok) {
        showTip("发送失败：" + (data.error || "请稍后重试"));
        return;
      }

      showTip("验证码已发送，请查收邮箱");
      setCountdown(60);
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch {
      showTip("发送失败，请检查后端服务");
    } finally {
      setSendingCode(false);
    }
  };

  const handleRegister = async () => {
    // Demo mode: allow registration without email/code.
    // if (!regUser || !regPwd || !regEmail || !regCode) return showTip("请填写完整信息！");
    if (!regUser || !regPwd) return showTip("请填写用户名和密码！");
    if (regPwd.length < 6) return showTip("密码长度不能少于6位！");
    // if (!/^[A-Za-z0-9._%+-]+@qq\.com$/i.test(regEmail)) {
    //   return showTip("请填写有效的QQ邮箱！");
    // }
    try {
      const res = await api.register(regUser, regPwd, regEmail, regCode, hpWebsite, hpNickname);
      if (res.ok) {
        showTip("注册成功！请登录");
        setTimeout(() => {
          setTab("login");
          closeTip();
        }, 1000);
      } else {
        const data = await res.json();
        showTip("注册失败：" + (data.error || "请稍后重试"));
      }
    } catch {
      showTip("注册失败，请检查服务！");
    }
  };

  const handleLogin = async () => {
    if (!loginUser || !loginPwd) return showTip("请填写用户名和密码！");
    try {
      const data = await api.login(loginUser, loginPwd);
      localStorage.setItem("loginUser", JSON.stringify(data));
      const isAdmin =
        data.role === "admin" ||
        data.role === "manager" ||
        data.permission === "level1" ||
        data.permission === "level2";
      if (isAdmin) {
        showTip("管理员登录成功！跳转控制台...");
        setTimeout(() => router.push("/admin"), 1000);
      } else {
        showTip("登录成功！跳转用户中心...");
        setTimeout(() => router.push("/user"), 1000);
      }
    } catch (err: any) {
      showTip("登录失败：" + err.message);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden px-4 py-6 text-slate-900 md:px-6 md:py-8 lg:px-8">
      <div className="glass-card pointer-events-none absolute left-6 top-12 h-44 w-44 rounded-full opacity-35 blur-3xl md:left-12 md:h-60 md:w-60" />
      <div className="glass-card pointer-events-none absolute right-6 top-20 h-56 w-56 rounded-full opacity-28 blur-3xl md:right-12 md:h-72 md:w-72" />
      <div className="glass-card pointer-events-none absolute bottom-8 left-1/3 h-48 w-48 rounded-full opacity-25 blur-3xl" />

      <div className="mx-auto grid w-full max-w-6xl gap-8 lg:grid-cols-[1.1fr_.9fr] lg:gap-12">
        <div className="relative overflow-hidden rounded-[2.5rem] border border-slate-200/60 bg-[linear-gradient(180deg,rgba(15,23,42,0.94),rgba(30,41,59,0.88))] p-8 text-black shadow-[0_24px_80px_rgba(15,23,42,0.16)] md:p-12 lg:p-14">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(125,154,184,0.22),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.1),transparent_28%)]" />
          <div className="relative z-10 max-w-2xl">
            <div className="mb-6 flex items-center gap-3">
              <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-base backdrop-blur-xl">✈️</span>
              <span className="text-sm uppercase tracking-[0.32em] text-black/65">Plane Discussion Community</span>
            </div>
            <h1 className="mb-5 max-w-xl text-5xl font-semibold leading-[1.05] tracking-[-0.04em] text-black md:text-6xl lg:text-7xl">
              飞机讨论社区
            </h1>
            <p className="max-w-xl text-lg leading-8 text-black/72 md:text-xl">
              一个专注于机型、航线与飞行体验交流的社区。这里保留克制的留白与柔和的层次，让内容始终是主角。
            </p>
          </div>
        </div>

        <div className="glass-shell rounded-[2.5rem] p-6 md:p-8 lg:p-10">
          <div className="relative z-10">
            <h2 className="mb-3 text-center text-2xl font-semibold text-slate-900 md:text-3xl">
              欢迎回来
            </h2>
            <p className="mb-8 text-center text-sm text-slate-500 md:text-base">
              登录后可进入用户中心或管理后台
            </p>

            <div className="mb-6 flex overflow-hidden rounded-full border border-slate-200 bg-white/70 p-1 backdrop-blur-xl">
              <button
                className={tabClass(tab === "login")}
                data-active={tab === "login"}
                onClick={() => setTab("login")}
              >
                登录
              </button>
              <button
                className={tabClass(tab === "register")}
                data-active={tab === "register"}
                onClick={() => setTab("register")}
              >
                注册
              </button>
            </div>

            {tab === "login" ? (
              <div>
                <div className="mb-5">
                  <label className="mb-2 block text-sm text-slate-500">用户名</label>
                  <input
                    type="text"
                    className={inputClass}
                    value={loginUser}
                    onChange={(e) => setLoginUser(e.target.value)}
                    placeholder="请输入用户名"
                  />
                </div>
                <div className="mb-5">
                  <label className="mb-2 block text-sm text-slate-500">密码</label>
                  <input
                    type="password"
                    className={inputClass}
                    value={loginPwd}
                    onChange={(e) => setLoginPwd(e.target.value)}
                    placeholder="请输入密码"
                  />
                </div>
                <button
                  className="glass-button w-full rounded-2xl py-3 text-lg font-medium"
                  onClick={handleLogin}
                >
                  登录
                </button>
              </div>
            ) : (
              <div>
                <div className="mb-5">
                  <label className="mb-2 block text-sm text-slate-500">用户名</label>
                  <input
                    type="text"
                    className={inputClass}
                    value={regUser}
                    onChange={(e) => setRegUser(e.target.value)}
                    placeholder="请输入用户名"
                  />
                </div>
                <div className="mb-5">
                  <label className="mb-2 block text-sm text-slate-500">密码</label>
                  <input
                    type="password"
                    className={inputClass}
                    value={regPwd}
                    onChange={(e) => setRegPwd(e.target.value)}
                    placeholder="请输入密码（≥6位）"
                  />
                </div>
                <div className="mb-5">
                  <label className="mb-2 block text-sm text-slate-500">QQ邮箱</label>
                  <input
                    type="email"
                    className={inputClass}
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="请输入QQ邮箱（如 123456@qq.com）"
                  />
                </div>
                <div className="mb-5">
                  <label className="mb-2 block text-sm text-slate-500">邮箱验证码</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      className={`${inputClass} flex-1`}
                      value={regCode}
                      onChange={(e) => setRegCode(e.target.value)}
                      placeholder="请输入6位验证码"
                    />
                    <button
                      className="glass-button-secondary whitespace-nowrap rounded-2xl px-4 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-55"
                      onClick={handleSendCode}
                      disabled={sendingCode || countdown > 0}
                      type="button"
                    >
                      {countdown > 0 ? `${countdown}s` : sendingCode ? "发送中" : "发送验证码"}
                    </button>
                  </div>
                </div>
                <div className="hidden" aria-hidden="true">
                  <label>网站</label>
                  <input
                    type="text"
                    tabIndex={-1}
                    autoComplete="off"
                    value={hpWebsite}
                    onChange={(e) => setHpWebsite(e.target.value)}
                    name="website"
                  />
                  <label>昵称</label>
                  <input
                    type="text"
                    tabIndex={-1}
                    autoComplete="off"
                    value={hpNickname}
                    onChange={(e) => setHpNickname(e.target.value)}
                    name="nickname"
                  />
                </div>
                <button
                  className="glass-button w-full rounded-2xl py-3 text-lg font-medium"
                  onClick={handleRegister}
                >
                  注册
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {tip.show && (
        <div className="glass-modal-backdrop fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="glass-shell w-full max-w-sm rounded-[1.6rem] p-6 text-center text-slate-900">
            <p className="mb-5 text-base leading-7">{tip.text}</p>
            <button
              className="glass-button w-full rounded-2xl px-6 py-3 font-medium"
              onClick={closeTip}
            >
              确定
            </button>
          </div>
        </div>
      )}
    </div>
  );
}