package com.example.trading.service;

import com.example.trading.model.Order;
import com.example.trading.model.Order.Side;
import com.example.trading.model.Order.Status;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicLong;

@Service
public class OrderService {
    private final SimpMessagingTemplate ws;
    private final AtomicLong seq = new AtomicLong(1);
    private final List<Order> store = new ArrayList<>();

    public OrderService(SimpMessagingTemplate ws) {
        this.ws = ws;
    }

    public Order place(String user, String ticker, int qty, BigDecimal limitPrice, Side side){
        var o = new Order(seq.getAndIncrement(), user, ticker, qty, limitPrice, side, Status.NEW, Instant.now());
        // Fill immediately for the demo
        o.setStatus(Status.FILLED);
        store.add(o);
        ws.convertAndSend("/topic/orders", o);
        return o;
    }

    public List<Order> all(){ return store; }
}
