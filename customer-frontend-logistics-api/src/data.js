export const shipments = [
  {
    orderId: "ORD-20260717-001",
    trackingNumber: "SF1234567890",
    carrier: "顺丰速运",
    status: "in_transit",
    statusText: "运输中",
    estimatedDelivery: "2026-07-19",
    receiver: "王先生",
    receiverPhone: "138****5678",
    latestEvent: "快件已到达上海虹桥中转场",
    events: [
      { time: "2026-07-17T08:30:00+08:00", location: "杭州余杭", description: "快件已揽收" },
      { time: "2026-07-17T13:20:00+08:00", location: "杭州萧山", description: "快件已发出" },
      { time: "2026-07-18T02:15:00+08:00", location: "上海虹桥", description: "快件已到达中转场" }
    ]
  },
  {
    orderId: "ORD-20260717-002",
    trackingNumber: "YT9876543210",
    carrier: "圆通速递",
    status: "delivered",
    statusText: "已签收",
    estimatedDelivery: "2026-07-17",
    receiver: "李女士",
    receiverPhone: "186****1234",
    latestEvent: "快件已由本人签收",
    events: [
      { time: "2026-07-16T09:10:00+08:00", location: "苏州工业园区", description: "快件已揽收" },
      { time: "2026-07-17T09:35:00+08:00", location: "南京鼓楼", description: "派送中" },
      { time: "2026-07-17T11:42:00+08:00", location: "南京鼓楼", description: "本人签收" }
    ]
  },
  {
    orderId: "ORD-20260717-003",
    trackingNumber: "JD0000123456",
    carrier: "京东物流",
    status: "exception",
    statusText: "配送异常",
    estimatedDelivery: "2026-07-20",
    receiver: "赵先生",
    receiverPhone: "139****8899",
    latestEvent: "收件地址不完整，等待收件人补充",
    events: [
      { time: "2026-07-17T10:00:00+08:00", location: "北京大兴", description: "仓库已出库" },
      { time: "2026-07-18T08:50:00+08:00", location: "北京朝阳", description: "地址信息不完整" }
    ]
  },
  {
    orderId: "ORD-20260717-004",
    trackingNumber: null,
    carrier: null,
    status: "pending",
    statusText: "待发货",
    estimatedDelivery: null,
    receiver: "陈女士",
    receiverPhone: "135****2468",
    latestEvent: "商家正在备货，预计 24 小时内发出",
    events: []
  }
];
