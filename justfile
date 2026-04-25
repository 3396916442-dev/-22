export PORT_BACKEND := "8080"
export PORT_FRONTEND := "3000"

# 启动 Go 后端
run-backend:
    @echo "🚀 启动 Go 后端服务，监听端口 {{PORT_BACKEND}}"
    go run .

# 启动 Next.js 前端
run-frontend:
    @echo "🌐 启动 Next.js 开发服务器，监听端口 {{PORT_FRONTEND}}"
    cd frontend && npm run dev

# 同时启动前后端（新终端运行）
run-all:
    just run-backend &
    just run-frontend

# 停止所有
stop:
    @pkill -f "go run ." || true
    @pkill -f "next dev" || true

default:
    just --list

