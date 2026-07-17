# Mock 物流服务

供客服 Agent Tool 调用的 Node.js + Express Mock API，默认监听 `127.0.0.1:3100`。

## 启动

完整联调推荐在仓库根目录运行 `pnpm dev`。仅启动 Mock 物流服务：

```powershell
cd G:\customer-service-dataset
pnpm dev:logistics
```

## 接口

- `GET /health`
- `GET /api/logistics?orderId=ORD-20260717-001`
- `GET /api/logistics?trackingNumber=SF1234567890`
- `GET /api/orders/:orderId/logistics`
- `GET /api/mock/orders`：查看全部 Mock 数据

可用订单号：

| 订单号 | 状态 |
| --- | --- |
| `ORD-20260717-001` | 顺丰运输中 |
| `ORD-20260717-002` | 圆通已签收 |
| `ORD-20260717-003` | 京东配送异常 |
| `ORD-20260717-004` | 待发货 |

## 测试

```powershell
pnpm test
```
