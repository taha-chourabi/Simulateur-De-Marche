package com.example.trading.model;

import java.math.BigDecimal;
import java.time.Instant;

public class Order {
    public enum Side { BUY, SELL, PUT, CALL, STRADDLE, STRANGLE, SPREAD }

    public enum Status { NEW, FILLED, REJECTED }

    private long id;
    private String user; // simple username string
    private String ticker;
    private int quantity;
    private BigDecimal limitPrice;
    private Side side;
    private Status status;
    private Instant ts;

    public Order(long id, String user, String ticker, int quantity, BigDecimal limitPrice, Side side, Status status, Instant ts) {
        this.id = id;
        this.user = user;
        this.ticker = ticker;
        this.quantity = quantity;
        this.limitPrice = limitPrice;
        this.side = side;
        this.status = status;
        this.ts = ts;
    }

    public long getId() { return id; }
    public String getUser() { return user; }
    public String getTicker() { return ticker; }
    public int getQuantity() { return quantity; }
    public BigDecimal getLimitPrice() { return limitPrice; }
    public Side getSide() { return side; }
    public Status getStatus() { return status; }
    public Instant getTs() { return ts; }

    public void setStatus(Status status) { this.status = status; }
}