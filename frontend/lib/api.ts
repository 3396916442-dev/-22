const API_BASE = "http://localhost:8080/api";

export interface LoginResponse {
  message: string;
  role: string;
  username: string;
  permission: string;
}

export interface ApplicationRequest {
  id: number;
  request_type: string;
  applicant_username: string;
  reason?: string;
  group_name?: string;
  purpose?: string;
  members?: string;
  status: string;
  reviewer?: string;
  review_comment?: string;
  reviewed_at?: string | null;
  created_at: string;
  updated_at: string;
}

export const api = {
  async sendRegisterCode(email: string, website: string, nickname: string) {
    const res = await fetch(`${API_BASE}/send-register-code`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, website, nickname }),
    });
    return res;
  },

  async register(
    username: string,
    password: string,
    email: string,
    code: string,
    website: string,
    nickname: string
  ) {
    const res = await fetch(`${API_BASE}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, email, code, website, nickname }),
    });
    return res;
  },

  async submitAdminApplication(username: string, reason: string) {
    const res = await fetch(`${API_BASE}/applications/admin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, reason }),
    });
    return res;
  },

  async submitGroupApplication(
    username: string,
    groupName: string,
    purpose: string,
    members: string
  ) {
    const res = await fetch(`${API_BASE}/applications/group`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, group_name: groupName, purpose, members }),
    });
    return res;
  },

  async getMyApplications(username: string): Promise<ApplicationRequest[]> {
    const res = await fetch(`${API_BASE}/applications/me?username=${encodeURIComponent(username)}`);
    return res.json();
  },

  async getApplications(role: string, username: string, status = "", type = "") {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (type) params.set("type", type);
    const res = await fetch(`${API_BASE}/admin/applications?${params.toString()}`, {
      headers: {
        "X-User-Role": role,
      },
    });
    return res.json();
  },

  async reviewApplication(
    id: number,
    action: "approve" | "reject",
    role: string,
    username: string,
    comment = ""
  ) {
    const res = await fetch(`${API_BASE}/admin/applications/${id}/${action}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-User-Role": role,
        "X-User-Name": username,
      },
      body: JSON.stringify({ comment }),
    });
    return res;
  },

  async login(username: string, password: string): Promise<LoginResponse> {
    const res = await fetch(`${API_BASE}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) throw new Error((await res.json()).error);
    return res.json();
  },

  async getUsers(role: string) {
    const res = await fetch(`${API_BASE}/admin/users`, {
      headers: { "X-User-Role": role },
    });
    return res.json();
  },

  async deleteUser(id: number, role: string) {
    const res = await fetch(`${API_BASE}/admin/users/${id}`, {
      method: "DELETE",
      headers: { "X-User-Role": role },
    });
    return res;
  },

  async updateUser(id: number, updates: any, role: string) {
    const res = await fetch(`${API_BASE}/admin/users/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "X-User-Role": role,
      },
      body: JSON.stringify(updates),
    });
    return res;
  },

  async getInactiveUsers() {
    const res = await fetch(`${API_BASE}/admin/inactive-users`);
    return res.json();
  },
};