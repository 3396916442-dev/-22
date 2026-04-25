"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApplicationRequest, LoginResponse } from "@/lib/api";

const planeOptions = [
  { value: "C919", label: "中国商飞 C919", url: "/plane/c919" },
  { value: "A320", label: "空客 A320neo", url: "/plane/a320" },
  { value: "A350", label: "空客 A350-900", url: "/plane/a350" },
  { value: "B737", label: "波音 737 MAX", url: "/plane/b737" },
  { value: "B787", label: "波音 787-9 梦想客机", url: "/plane/b787" },
  { value: "ARJ21", label: "中国商飞 ARJ21", url: "/plane/arj21" },
  { value: "MA60", label: "新舟 60", url: "/plane/ma60" },
  { value: "G650", label: "湾流 G650ER 公务机", url: "/plane/g650" },
];

export default function UserPage() {
  const [loginInfo, setLoginInfo] = useState<LoginResponse | null>(null);
  const [selectedPlane, setSelectedPlane] = useState("");
  const [tip, setTip] = useState("");
  const [adminReason, setAdminReason] = useState("");
  const [groupName, setGroupName] = useState("");
  const [groupPurpose, setGroupPurpose] = useState("");
  const [groupMembers, setGroupMembers] = useState("");
  const [myApplications, setMyApplications] = useState<ApplicationRequest[]>([]);
  const [appLoading, setAppLoading] = useState(false);
  const router = useRouter();
  const cardClass = "glass-card rounded-[1.75rem] p-6 md:p-8";
  const inputClass =
    "glass-input rounded-2xl px-4 py-3 text-[15px] text-black placeholder:text-black/50";

  useEffect(() => {
    const stored = localStorage.getItem("loginUser");
    if (!stored) {
      router.push("/");
      return;
    }

    const info: LoginResponse = JSON.parse(stored);
    setLoginInfo(info);

    const saved = localStorage.getItem("userFavoritePlane");
    if (saved) {
      setSelectedPlane(saved);
      setTip(`✅ 当前已选择：${saved}`);
    }
  }, [router]);

  useEffect(() => {
    if (!loginInfo?.username) return;

    const loadMyApplications = async () => {
      try {
        setAppLoading(true);
        const data = await api.getMyApplications(loginInfo.username);
        setMyApplications(data);
      } catch {
        setMyApplications([]);
      } finally {
        setAppLoading(false);
      }
    };

    loadMyApplications();
  }, [loginInfo]);

  const handleSave = () => {
    if (!selectedPlane) return alert("请先选择一款飞机机型哦！");
    localStorage.setItem("userFavoritePlane", selectedPlane);
    const option = planeOptions.find((p) => p.value === selectedPlane);
    setTip(`✅ 机型保存成功！即将跳转到${selectedPlane}介绍页...`);
    setTimeout(() => {
      if (option) router.push(option.url);
    }, 1000);
  };

  const handleApplyAdmin = async () => {
    if (!loginInfo?.username) return;
    try {
      const res = await api.submitAdminApplication(loginInfo.username, adminReason);
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "提交失败");
        return;
      }
      alert("管理员申请已提交");
      setAdminReason("");
      const updated = await api.getMyApplications(loginInfo.username);
      setMyApplications(updated);
    } catch (err: any) {
      alert("提交失败：" + err.message);
    }
  };

  const handleApplyGroup = async () => {
    if (!loginInfo?.username) return;
    if (!groupName.trim() || !groupPurpose.trim() || !groupMembers.trim()) {
      return alert("请填写完整的小组信息");
    }

    try {
      const res = await api.submitGroupApplication(
        loginInfo.username,
        groupName,
        groupPurpose,
        groupMembers
      );
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "提交失败");
        return;
      }
      alert("飞机讨论小组申请已提交");
      setGroupName("");
      setGroupPurpose("");
      setGroupMembers("");
      const updated = await api.getMyApplications(loginInfo.username);
      setMyApplications(updated);
    } catch (err: any) {
      alert("提交失败：" + err.message);
    }
  };

  const formatAppType = (type: string) => {
    if (type === "admin_application") return "申请管理员";
    if (type === "group_application") return "组建讨论小组";
    return type;
  };

  const formatAppStatus = (status: string) => {
    if (status === "pending") return "待审核";
    if (status === "approved") return "已通过";
    if (status === "rejected") return "已拒绝";
    return status;
  };

  return (
    <div className="relative min-h-screen overflow-hidden px-5 py-10 text-black">
      <div className="glass-card pointer-events-none absolute left-8 top-16 h-48 w-48 rounded-full opacity-30 blur-3xl" />
      <div className="glass-card pointer-events-none absolute right-10 top-20 h-60 w-60 rounded-full opacity-25 blur-3xl" />
      <div className="glass-shell mx-auto w-full max-w-4xl rounded-[2rem] p-6 md:p-10">
        <div className="relative z-10 text-center">
        <h1 className="mb-4 flex items-center justify-center gap-3 text-4xl font-semibold text-black md:text-5xl">
          <span className="glass-badge rounded-full px-3 py-1 text-xl">✈️</span> 用户中心
        </h1>
        <p className="mb-2 text-xl text-black/90">普通用户登录成功</p>
        <p className="mb-8 text-black/70">欢迎加入飞机爱好者社区</p>

        <div className={`${cardClass} mb-8 text-left`}>
          <h3 className="mb-4 flex items-center gap-2 text-2xl font-bold text-black">
            <span>✈️</span> 选择你喜欢的飞机机型
          </h3>
          <div className="mb-4">
            <label className="mb-2 block text-black/75">常用民航/国产机型</label>
            <select
              className={`${inputClass} glass-select text-lg`}
              value={selectedPlane}
              onChange={(e) => setSelectedPlane(e.target.value)}
            >
              <option value="">请选择机型</option>
              {planeOptions.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <button
            className="glass-button rounded-2xl px-6 py-3 text-lg font-medium"
            onClick={handleSave}
          >
            保存我的选择
          </button>
          {tip && <p className="mt-3 text-black">{tip}</p>}
        </div>

        <div className={`${cardClass} mb-8 text-left`}>
          <h3 className="mb-4 flex items-center gap-2 text-2xl font-bold text-black">
            <span>📝</span> 申请功能
          </h3>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="glass-card rounded-[1.5rem] p-5 text-left">
              <h4 className="mb-3 text-xl font-semibold text-black">申请成为管理员</h4>
              <textarea
                className={`${inputClass} glass-textarea mb-3 min-h-[120px] rounded-2xl p-4`}
                placeholder="填写你的申请理由，例如：希望协助管理社区内容"
                value={adminReason}
                onChange={(e) => setAdminReason(e.target.value)}
              />
              <button
                className="glass-button w-full rounded-2xl px-4 py-3 font-medium"
                onClick={handleApplyAdmin}
              >
                提交管理员申请
              </button>
            </div>

            <div className="glass-card rounded-[1.5rem] p-5 text-left">
              <h4 className="mb-3 text-xl font-semibold text-black">申请组建飞机讨论小组</h4>
              <div className="space-y-3">
                <input
                  className={inputClass}
                  placeholder="小组名字"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                />
                <textarea
                  className={`${inputClass} glass-textarea min-h-[90px] rounded-2xl p-4`}
                  placeholder="用途，例如：讨论航司、机型、飞行体验"
                  value={groupPurpose}
                  onChange={(e) => setGroupPurpose(e.target.value)}
                />
                <textarea
                  className={`${inputClass} glass-textarea min-h-[90px] rounded-2xl p-4`}
                  placeholder="小组成员，建议用逗号或换行分隔"
                  value={groupMembers}
                  onChange={(e) => setGroupMembers(e.target.value)}
                />
                <button
                  className="glass-button w-full rounded-2xl px-4 py-3 font-medium"
                  onClick={handleApplyGroup}
                >
                  提交小组申请
                </button>
              </div>
            </div>
          </div>

          <div className="glass-card mt-6 rounded-[1.5rem] p-5 text-left">
            <h4 className="mb-3 text-xl font-semibold text-black">我的申请</h4>
            {appLoading ? (
              <p className="text-black/75">加载中...</p>
            ) : myApplications.length === 0 ? (
              <p className="text-black/65">暂无申请记录</p>
            ) : (
              <div className="space-y-3">
                {myApplications.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-white/15 bg-white/8 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <div className="font-semibold text-black">
                        {formatAppType(item.request_type)}
                      </div>
                      <div className="text-sm text-black/75">
                        状态：{formatAppStatus(item.status)}
                      </div>
                    </div>
                    {item.request_type === "admin_application" ? (
                      <p className="whitespace-pre-wrap text-sm text-black/80">
                        {item.reason || "无申请理由"}
                      </p>
                    ) : (
                      <div className="space-y-1 text-sm text-black/80">
                        <p>小组名字：{item.group_name}</p>
                        <p>用途：{item.purpose}</p>
                        <p>成员：{item.members}</p>
                      </div>
                    )}
                    {item.review_comment && (
                      <p className="mt-2 text-sm text-black/60">审核备注：{item.review_comment}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <button
          className="glass-button rounded-2xl px-8 py-3 font-medium"
          onClick={() => router.push("/")}
        >
          返回登录
        </button>
        </div>
      </div>
    </div>
  );
}
