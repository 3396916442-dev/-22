"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApplicationRequest, LoginResponse } from "@/lib/api";

interface User {
  id: number;
  username: string;
  role: string;
  permission_level: string;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export default function AdminPage() {
  const router = useRouter();
  const [loginInfo, setLoginInfo] = useState<LoginResponse | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [applications, setApplications] = useState<ApplicationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [appLoading, setAppLoading] = useState(true);
  const [error, setError] = useState("");
  const [appError, setAppError] = useState("");
  const [appStatusFilter, setAppStatusFilter] = useState("pending");
  const [appTypeFilter, setAppTypeFilter] = useState("all");

  // 弹窗状态
  const [editModal, setEditModal] = useState<{
    show: boolean;
    id: number;
    username: string;
    role: string;
    perm: string;
  }>({ show: false, id: 0, username: "", role: "user", perm: "user" });

  const [deleteModal, setDeleteModal] = useState<{
    show: boolean;
    id: number;
  }>({ show: false, id: 0 });

  const [inactiveModal, setInactiveModal] = useState<{
    show: boolean;
    users: User[];
  }>({ show: false, users: [] });
  const shellClass = "glass-shell rounded-[2rem] p-6 md:p-8";
  const panelClass = "glass-card rounded-[1.5rem] p-5 md:p-6";
  const controlClass =
    "glass-input glass-select rounded-2xl px-3 py-2 text-sm text-black";

  // 权限判断
  useEffect(() => {
    const stored = localStorage.getItem("loginUser");
    if (!stored) {
      router.push("/");
      return;
    }
    const info: LoginResponse = JSON.parse(stored);
    const isAdmin =
      info.role === "admin" ||
      info.role === "manager" ||
      info.permission === "level1" ||
      info.permission === "level2";
    if (!isAdmin) {
      alert("权限不足！");
      router.push("/");
      return;
    }
    setLoginInfo(info);
  }, [router]);

  // 加载用户列表
  const loadUsers = async () => {
    if (!loginInfo) return;
    try {
      setLoading(true);
      const data = await api.getUsers(loginInfo.role);
      setUsers(data);
    } catch (err: any) {
      setError(err.message || "加载失败");
    } finally {
      setLoading(false);
    }
  };

  const loadApplications = async () => {
    if (!loginInfo) return;
    try {
      setAppLoading(true);
      const data = await api.getApplications(
        loginInfo.role,
        loginInfo.username,
        appStatusFilter === "all" ? "" : appStatusFilter,
        appTypeFilter === "all" ? "" : appTypeFilter
      );
      setApplications(data);
      setAppError("");
    } catch (err: any) {
      setAppError(err.message || "加载申请失败");
    } finally {
      setAppLoading(false);
    }
  };

  useEffect(() => {
    if (loginInfo) {
      loadUsers();
    }
  }, [loginInfo]);

  useEffect(() => {
    if (loginInfo) {
      loadApplications();
    }
  }, [loginInfo, appStatusFilter, appTypeFilter]);

  // 角色描述
  const getRoleDesc = () => {
    if (!loginInfo) return "";
    if (loginInfo.role === "admin") return "超级管理员（拥有所有权限）";
    if (loginInfo.role === "manager" && loginInfo.permission === "level1")
      return "一级管理员（可修改用户信息，不可删除）";
    if (loginInfo.role === "manager" && loginInfo.permission === "level2")
      return "二级管理员（仅可查看，不可修改或删除）";
    return "管理员（权限受限）";
  };

  // 检测垃圾用户
  const detectInactive = async () => {
    try {
      const data = await api.getInactiveUsers();
      // 过滤掉 admin 用户
      const filtered = data.filter((u: User) => u.username !== "admin");
      setInactiveModal({ show: true, users: filtered });
    } catch (err: any) {
      alert("检测失败：" + err.message);
    }
  };

  const handleReview = async (id: number, action: "approve" | "reject") => {
    if (!loginInfo) return;
    const comment = window.prompt(action === "approve" ? "输入通过备注（可选）" : "输入拒绝原因（可选）", "") || "";
    try {
      const res = await api.reviewApplication(id, action, loginInfo.role, loginInfo.username, comment);
      if (res.ok) {
        alert(action === "approve" ? "已通过申请" : "已拒绝申请");
        loadApplications();
        loadUsers();
      } else {
        const data = await res.json();
        alert((action === "approve" ? "通过失败：" : "拒绝失败：") + (data.error || "未知错误"));
      }
    } catch (err: any) {
      alert("网络错误：" + err.message);
    }
  };

  // 编辑按钮逻辑
  const handleEdit = (user: User) => {
    if (!loginInfo) return;
    if (user.username === "admin") {
      alert("超级管理员不可修改");
      return;
    }
    if (loginInfo.role === "manager" && loginInfo.permission === "level2") {
      alert("您没有修改权限");
      return;
    }
    setEditModal({
      show: true,
      id: user.id,
      username: user.username,
      role: user.role,
      perm: user.permission_level,
    });
  };

  // 提交修改
  const submitEdit = async () => {
    if (!loginInfo) return;
    const { id, username, role, perm } = editModal;
    if (!username.trim()) return alert("用户名不能为空");

    const updates: any = { username, role };
    if (loginInfo.role === "admin") {
      updates.permission_level = perm;
    }

    try {
      const res = await api.updateUser(id, updates, loginInfo.role);
      if (res.ok) {
        alert("修改成功！");
        setEditModal({ show: false, id: 0, username: "", role: "user", perm: "user" });
        loadUsers();
      } else {
        const data = await res.json();
        alert("修改失败：" + (data.error || "未知错误"));
      }
    } catch (err: any) {
      alert("网络错误：" + err.message);
    }
  };

  // 删除逻辑
  const handleDelete = (user: User) => {
    if (!loginInfo) return;
    if (user.username === "admin") {
      alert("超级管理员不可删除");
      return;
    }
    if (loginInfo.role !== "admin") {
      alert("只有超级管理员可以删除用户");
      return;
    }
    setDeleteModal({ show: true, id: user.id });
  };

  const submitDelete = async () => {
    if (!loginInfo) return;
    try {
      const res = await api.deleteUser(deleteModal.id, loginInfo.role);
      if (res.ok) {
        alert("删除成功！");
        setDeleteModal({ show: false, id: 0 });
        loadUsers();
      } else {
        const data = await res.json();
        alert("删除失败：" + (data.error || "无删除权限"));
      }
    } catch (err: any) {
      alert("网络错误：" + err.message);
    }
  };

  // 退出登录
  const logout = () => {
    localStorage.clear();
    router.push("/");
  };

  // 格式化时间
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "从未登录";
    return new Date(dateStr).toLocaleString();
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

  // 判断按钮权限
  const canEdit = (user: User) => {
    if (!loginInfo) return false;
    if (user.username === "admin") return false;
    if (loginInfo.role === "admin") return true;
    if (loginInfo.role === "manager" && loginInfo.permission === "level1") return true;
    return false;
  };

  const canDelete = (user: User) => {
    if (!loginInfo) return false;
    if (user.username === "admin") return false;
    return loginInfo.role === "admin";
  };

  if (!loginInfo) {
    return <div className="p-8 text-center">验证权限中...</div>;
  }

  return (
    <div className="relative min-h-screen overflow-hidden px-5 py-8 text-black">
      <div className="glass-card pointer-events-none absolute left-8 top-14 h-56 w-56 rounded-full opacity-25 blur-3xl" />
      <div className="glass-card pointer-events-none absolute right-12 top-24 h-72 w-72 rounded-full opacity-20 blur-3xl" />
      <div className="mx-auto w-full max-w-6xl">
      <div className={shellClass}>
        {/* 头部 */}
        <div className="mb-6 flex items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <button
            onClick={logout}
            className="glass-button rounded-2xl px-6 py-2 font-medium"
          >
            退出登录
          </button>
          <button
            onClick={detectInactive}
            className="glass-button-secondary rounded-2xl px-6 py-2 font-bold text-black"
          >
            🔍 检测垃圾用户（从未登录）
          </button>
        </div>

        <div className="mb-8 text-center">
          <h1 className="flex items-center justify-center gap-2 text-3xl font-semibold text-black md:text-4xl">
            <span className="glass-badge rounded-full px-3 py-1 text-lg">✈️</span> 管理员控制台
          </h1>
          <p className="mt-2 text-black/75">当前身份：{getRoleDesc()}</p>
        </div>

        {/* 用户表格 */}
        {loading ? (
          <div className="py-8 text-center">加载中...</div>
        ) : error ? (
          <div className="py-8 text-center text-black">{error}</div>
        ) : (
          <div className={panelClass}>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="p-4 text-black/85">ID</th>
                    <th className="p-4 text-black/85">用户名</th>
                    <th className="p-4 text-black/85">角色</th>
                    <th className="p-4 text-black/85">权限等级</th>
                    <th className="p-4 text-black/85">最后登录时间</th>
                    <th className="p-4 text-black/85">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-white/5">
                      <td className="p-4 text-center">{user.id}</td>
                      <td className="p-4 text-center">
                        {user.username}
                        {!user.last_login_at && (
                          <span className="ml-2 text-black">⚠️</span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        {user.role === "admin"
                          ? "👑 超级管理员"
                          : user.role === "manager"
                          ? "📋 管理员"
                          : "👤 普通用户"}
                      </td>
                      <td className="p-4 text-center">
                        {user.permission_level === "level1"
                          ? "一级管理员"
                          : user.permission_level === "level2"
                          ? "二级管理员"
                          : "普通用户"}
                      </td>
                      <td className="p-4 text-center">{formatDate(user.last_login_at)}</td>
                      <td className="p-4 text-center space-x-2">
                        {canEdit(user) ? (
                          <button
                            onClick={() => handleEdit(user)}
                            className="glass-button rounded-xl px-3 py-1.5 text-sm font-medium"
                          >
                            修改
                          </button>
                        ) : (
                          <span className="glass-badge rounded-xl px-3 py-1.5 text-sm text-black/60">
                            不可修改
                          </span>
                        )}
                        {canDelete(user) ? (
                          <button
                            onClick={() => handleDelete(user)}
                            className="glass-button-secondary rounded-xl px-3 py-1.5 text-sm font-medium text-black"
                          >
                            删除
                          </button>
                        ) : (
                          <span className="glass-badge rounded-xl px-3 py-1.5 text-sm text-black/60">
                            不可删除
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 申请审核 */}
        <div className={`${panelClass} mt-10`}>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
            <h2 className="text-2xl text-black">申请审核</h2>
            <div className="flex gap-3 flex-wrap">
              <select
                className={controlClass}
                value={appStatusFilter}
                onChange={(e) => setAppStatusFilter(e.target.value)}
              >
                <option value="all">全部状态</option>
                <option value="pending">待审核</option>
                <option value="approved">已通过</option>
                <option value="rejected">已拒绝</option>
              </select>
              <select
                className={controlClass}
                value={appTypeFilter}
                onChange={(e) => setAppTypeFilter(e.target.value)}
              >
                <option value="all">全部类型</option>
                <option value="admin_application">申请管理员</option>
                <option value="group_application">组建讨论小组</option>
              </select>
            </div>
          </div>

          {appLoading ? (
            <div className="py-6 text-center">加载申请中...</div>
          ) : appError ? (
            <div className="py-6 text-center text-black">{appError}</div>
          ) : applications.length === 0 ? (
            <div className="py-6 text-center text-black/70">暂无符合条件的申请</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="p-3 text-black/85">ID</th>
                    <th className="p-3 text-black/85">类型</th>
                    <th className="p-3 text-black/85">申请人</th>
                    <th className="p-3 text-black/85">内容</th>
                    <th className="p-3 text-black/85">状态</th>
                    <th className="p-3 text-black/85">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {applications.map((item) => (
                    <tr key={item.id} className="align-top hover:bg-white/5">
                      <td className="p-3 text-center">{item.id}</td>
                      <td className="p-3 text-center">{formatAppType(item.request_type)}</td>
                      <td className="p-3 text-center">{item.applicant_username}</td>
                      <td className="p-3">
                        {item.request_type === "admin_application" ? (
                          <div>
                            <p className="mb-1 font-semibold">申请理由</p>
                            <p className="whitespace-pre-wrap text-sm text-black/80">{item.reason || "无"}</p>
                          </div>
                        ) : (
                          <div className="space-y-1 text-sm text-black/80">
                            <p><span className="text-black">小组名称：</span>{item.group_name || "-"}</p>
                            <p><span className="text-black">用途：</span>{item.purpose || "-"}</p>
                            <p><span className="text-black">成员：</span>{item.members || "-"}</p>
                          </div>
                        )}
                      </td>
                      <td className="p-3 text-center">{formatAppStatus(item.status)}</td>
                      <td className="p-3 text-center">
                        {item.status === "pending" ? (
                          <div className="flex gap-2 justify-center flex-wrap">
                            <button
                              className="glass-button rounded-xl px-3 py-1.5 text-sm font-medium"
                              onClick={() => handleReview(item.id, "approve")}
                            >
                              通过
                            </button>
                            <button
                              className="glass-button-secondary rounded-xl px-3 py-1.5 text-sm font-medium text-black"
                              onClick={() => handleReview(item.id, "reject")}
                            >
                              拒绝
                            </button>
                          </div>
                        ) : (
                          <span className="text-black/70">已处理</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 编辑弹窗 */}
        {editModal.show && (
          <div className="glass-modal-backdrop fixed inset-0 z-50 flex items-center justify-center px-4">
            <div className="glass-shell w-full max-w-md rounded-[1.7rem] p-6">
              <h3 className="mb-4 text-center text-xl text-black">修改用户信息</h3>
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="用户名"
                  className={controlClass}
                  value={editModal.username}
                  onChange={(e) =>
                    setEditModal({ ...editModal, username: e.target.value })
                  }
                  disabled={loginInfo?.role !== "admin" && loginInfo?.role !== "manager"}
                />
                <select
                  className={controlClass}
                  value={editModal.role}
                  onChange={(e) =>
                    setEditModal({ ...editModal, role: e.target.value })
                  }
                  disabled={loginInfo?.role !== "admin" && loginInfo?.role !== "manager"}
                >
                  <option value="user">普通用户</option>
                  <option value="manager">管理员</option>
                  {loginInfo?.role === "admin" && <option value="admin">超级管理员</option>}
                </select>
                {loginInfo?.role === "admin" && (
                  <select
                    className={controlClass}
                    value={editModal.perm}
                    onChange={(e) =>
                      setEditModal({ ...editModal, perm: e.target.value })
                    }
                  >
                    <option value="user">普通用户</option>
                    <option value="level1">一级管理员</option>
                    <option value="level2">二级管理员</option>
                  </select>
                )}
              </div>
              <div className="flex justify-center gap-4 mt-6">
                <button
                  onClick={submitEdit}
                  className="glass-button rounded-2xl px-6 py-2 font-medium"
                >
                  确认修改
                </button>
                <button
                  onClick={() =>
                    setEditModal({ show: false, id: 0, username: "", role: "user", perm: "user" })
                  }
                  className="glass-button-secondary rounded-2xl px-6 py-2 font-medium text-black"
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 删除确认弹窗 */}
        {deleteModal.show && (
          <div className="glass-modal-backdrop fixed inset-0 z-50 flex items-center justify-center px-4">
            <div className="glass-shell w-full max-w-md rounded-[1.7rem] p-6">
              <h3 className="mb-4 text-center text-xl text-black">确认删除</h3>
              <p className="mb-6 text-center text-black/80">此操作不可恢复！</p>
              <div className="flex justify-center gap-4">
                <button
                  onClick={submitDelete}
                  className="glass-button rounded-2xl px-6 py-2 font-medium"
                >
                  确认删除
                </button>
                <button
                  onClick={() => setDeleteModal({ show: false, id: 0 })}
                  className="glass-button-secondary rounded-2xl px-6 py-2 font-medium text-black"
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 垃圾用户检测结果弹窗 */}
        {inactiveModal.show && (
          <div className="glass-modal-backdrop fixed inset-0 z-50 flex items-center justify-center px-4">
            <div className="glass-shell glass-scrollbar max-h-[80%] w-full max-w-lg overflow-auto rounded-[1.7rem] p-6">
              <h3 className="mb-4 text-center text-xl text-black">⚠️ 垃圾用户检测</h3>
              <p className="mb-2 text-black/80">以下用户注册后从未登录过：</p>
              {inactiveModal.users.length === 0 ? (
                <p className="text-black">✅ 暂无垃圾用户（所有用户均曾登录过）</p>
              ) : (
                <ul className="space-y-2">
                  {inactiveModal.users.map((u) => (
                    <li key={u.id} className="border-b border-white/10 py-2">
                      ID: {u.id} | 用户名: {u.username} | 注册时间: {formatDate(u.created_at)}
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex justify-center mt-6">
                <button
                  onClick={() => setInactiveModal({ show: false, users: [] })}
                  className="glass-button rounded-2xl px-6 py-2 font-medium"
                >
                  关闭
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}