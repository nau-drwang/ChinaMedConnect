# Railway部署说明

## 重要文件说明

这个项目包含以下Railway配置文件：

1. **package.json** - Node.js项目配置，包含所有依赖
2. **nixpacks.toml** - Railway构建配置（告诉Railway使用Node.js 18）
3. **railway.json** - Railway部署配置
4. **Procfile** - 备用启动命令
5. **.npmrc** - npm配置

## 部署步骤

### 1. 确保所有文件都在GitHub

```bash
git add .
git commit -m "Add all Railway configuration files"
git push origin main
```

### 2. 在Railway中重新部署

方法A：自动重新部署
- Railway会检测到新的commit自动部署

方法B：手动重新部署
- 在Railway Dashboard → Deployments
- 点击右上角的 "..." 菜单
- 选择 "Redeploy"

### 3. 必须配置的环境变量

```bash
NODE_ENV=production
PORT=5000
MONGODB_URI=${{MongoDB.MONGO_URL}}
FRONTEND_URL=https://你的网站.netlify.app
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=contact.chinamedconnect@gmail.com
SMTP_PASS=你的16位应用专用密码
SMTP_FROM=ChinaMed Connect <contact.chinamedconnect@gmail.com>
ADMIN_EMAIL=contact.chinamedconnect@gmail.com
JWT_SECRET=chinamedconnect2024secretkey12345random
```

## 故障排除

### 如果还是出现 "Error creating build plan with Railpack"

1. 确保所有配置文件都已上传到GitHub
2. 在Railway中删除整个项目，重新创建
3. 或者尝试使用Dockerfile（见下方）

### 使用Dockerfile部署（备选方案）

如果nixpacks继续失败，可以创建Dockerfile。
