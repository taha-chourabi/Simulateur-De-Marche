package com.example.trading.web;
import com.example.trading.model.Order;
import com.example.trading.model.Order.Side;
import com.example.trading.service.OrderService;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.stereotype.Controller;

import java.math.BigDecimal;
@Controller

public class WebSocketOrderController {
    private final OrderService svc;

    public WebSocketOrderController(OrderService svc) {
        this.svc = svc;
    }

    @MessageMapping("/order")
    @SendTo("/topic/orders")
    public Order place(Order order) {
        // Ce handler reçoit les messages STOMP envoyés sur /app/order
        // et les renvoie à tous les abonnés de /topic/orders
        return svc.place(
                order.getUser(),
                order.getTicker(),
                order.getQuantity(),
                order.getLimitPrice() != null ? order.getLimitPrice() : BigDecimal.ZERO,
                order.getSide()
        );
    }
}

