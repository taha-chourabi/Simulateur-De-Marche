package com.example.trading.model;

import java.math.BigDecimal;
import java.time.Instant;

public class Quote {
    private String ticker;
    private BigDecimal price;
    private Instant ts;

    public Quote() {
    }

    public Quote(String ticker, BigDecimal price, Instant ts) {
        this.ticker = ticker;
        this.price = price;
        this.ts = ts;
    }

    public String getTicker() {
        return ticker;
    }

    public void setTicker(String ticker) {
        this.ticker = ticker;
    }

    public BigDecimal getPrice() {
        return price;
    }

    public void setPrice(BigDecimal price) {
        this.price = price;
    }

    public Instant getTs() {
        return ts;
    }

    public void setTs(Instant ts) {
        this.ts = ts;
    }
}
