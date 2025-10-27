package com.example.trading.service;

import com.example.trading.model.Quote;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.ThreadLocalRandom;

@Service


public class QuoteService {
    private final SimpMessagingTemplate ws;
    private final Map<String, Quote> last = new HashMap<>();
    private final List<String> symbols = List.of("AAPL","MSFT","GOOG","TSLA","AMZN");

    public QuoteService(SimpMessagingTemplate ws) {
        this.ws = ws;
        symbols.forEach(t -> last.put(t, new Quote(t, BigDecimal.valueOf(100), Instant.now())));
    }

    public List<String> symbols(){
        return symbols;
    }

    public Optional<Quote> last(String ticker){
        return Optional.ofNullable(last.get(ticker));
    }

    @Scheduled(fixedRate = 1000)
    public void tick() {
        for (String t : symbols) {
            Quote current = last.get(t);
            double base = current != null && current.getPrice() != null
                    ? current.getPrice().doubleValue()
                    : 100.0;

            double shock = ThreadLocalRandom.current().nextDouble(-0.8, 0.8);
            BigDecimal price = BigDecimal.valueOf(Math.max(1.0, base + shock));

            Quote q = new Quote(t, price, Instant.now());
            last.put(t, q);
            ws.convertAndSend("/topic/quotes", q);
            System.out.println("Tick sent: " + q);
            ws.convertAndSend("/topic/quotes", q);

        }
    }}