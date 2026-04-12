# ChinaMed Connect - 医疗旅游平台

## 📋 项目概述

ChinaMed Connect是一个连接英语国家患者与中国/台湾医院的医疗旅游平台。

- **目标市场：** 美国、加拿大、英国、澳大利亚等
- **核心价值：** 40-70%成本节省 + 世界级医疗服务
- **服务范围：** 19家顶级医院，9种医疗服务

## 🚀 快速开始

### 文件夹结构

```
chinamedconnect/
├── backend/              # 后端API服务
│   ├── server.js         # 主服务器
│   ├── package.json      # 依赖配置
│   ├── .env.example      # 环境变量示例
│   ├── .gitignore        # Git忽略文件
│   ├── models/           # 数据模型
│   │   ├── Admin.js
│   │   └── Consultation.js
│   └── routes/           # API路由
│       ├── admin.js
│       ├── consultations.js
│       └── payments.js
│
└── frontend/             # 前端页面
    ├── china-medical-tourism.html     # 主页
    ├── consultation-form.html         # 咨询表单
    ├── price-calculator.html          # 价格计算器
    ├── admin-dashboard.html           # 管理后台
    ├── payment.html                   # 支付页面
    ├── payment-success.html           # 支付成功
    └── payment-cancel.html            # 支付取消
```

## 📦 后端部署

### 1. 上传到GitHub

```bash
cd backend
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/你的用户名/chinamedconnect-backend.git
git push -u origin main
```

### 2. 部署到Railway

1. 访问 https://railway.app
2. 用GitHub登录
3. New Project → Deploy from GitHub repo
4. 选择你的仓库
5. 添加MongoDB数据库
6. 配置环境变量（见下方）

### 3. 环境变量配置

在Railway的Variables中添加：

```bash
NODE_ENV=production
PORT=5000
MONGODB_URI=${{MongoDB.MONGO_URL}}
FRONTEND_URL=https://你的网站.netlify.app

# Gmail SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=contact.chinamedconnect@gmail.com
SMTP_PASS=你的16位应用专用密码
SMTP_FROM=ChinaMed Connect <contact.chinamedconnect@gmail.com>
ADMIN_EMAIL=contact.chinamedconnect@gmail.com

# Security
JWT_SECRET=随机生成一个长字符串

# Stripe (测试模式)
STRIPE_SECRET_KEY=sk_test_你的密钥
STRIPE_WEBHOOK_SECRET=whsec_你的webhook密钥
```

## 🌐 前端部署

### 部署到Netlify

1. 访问 https://app.netlify.com
2. 用GitHub登录
3. 拖拽 `frontend` 文件夹到页面
4. 等待部署完成

### 更新API地址

在部署前，需要更新以下3个文件中的API地址：

- `admin-dashboard.html` (第235行)
- `payment.html` (第332行)
- `payment-success.html` (第186行)

将 `https://your-backend-url.up.railway.app` 替换为你的Railway地址

## 💳 Stripe支付配置

1. 注册 https://stripe.com
2. 获取测试API密钥
3. 创建Webhook：`https://你的railway地址.up.railway.app/api/payments/webhook`
4. 添加环境变量到Railway

## 🧪 测试

### 测试卡号

```
卡号：4242 4242 4242 4242
日期：12/34
CVC：123
邮编：12345
```

### 创建管理员

```bash
curl -X POST https://你的railway地址.up.railway.app/api/admin/create \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "email": "contact.chinamedconnect@gmail.com",
    "password": "YourPassword123",
    "fullName": "Your Name"
  }'
```

## 📚 文档

详细文档请查看：
- `COMPLETE_DEPLOYMENT_GUIDE.md` - 完整部署指南
- `STRIPE_INTEGRATION_GUIDE.md` - Stripe集成指南
- `PAYMENT_GUIDE.md` - 支付方案对比
- `PROJECT_SUMMARY.md` - 项目总结

## 💰 成本

- **开发/测试：** $0/月
- **生产运营：** $0-7/月（域名费用）
- **支付手续费：** 2.9% + $0.30 每笔交易

## 📞 联系方式

Email: contact.chinamedconnect@gmail.com

## 📄 许可证

MIT License
