# Docker 部署指南

## 快速开始

1. 构建并启动服务：
```bash
docker compose up -d --build
```

2. 访问服务：
   - 打开浏览器访问 `http://localhost:9998`
   - 注意：如果9999端口被占用，已配置为使用9998端口

## 端口配置

- 容器内部服务运行在 **9999** 端口
- 外部访问端口默认映射到 **9998**（避免端口冲突）
- 可以通过修改 `docker-compose.yml` 中的端口映射来更改：
  ```yaml
  ports:
    - "你想要的端口:9999"
  ```
- 环境配置文件：`.env.docker`

## 数据持久化

- 数据库文件会保存在 `./data` 目录中
- 确保该目录有适当的读写权限

## 常用命令

```bash
# 构建镜像
docker-compose build

# 启动服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down

# 重启服务
docker-compose restart

# 查看服务状态
docker-compose ps
```

## 注意事项

1. 生产环境部署时，后端服务器会同时提供API和前端静态文件，所以只需要一个端口
2. 首次运行时会自动创建数据库
3. 容器内部使用非 root 用户运行，提高安全性