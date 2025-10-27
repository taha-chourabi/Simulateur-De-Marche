package com.example.trading.web;

import com.example.trading.model.Quote;
import com.example.trading.service.QuoteService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;

@RestController
@RequestMapping("/api/quotes")
public class QuoteController {
    private final QuoteService svc;
    public QuoteController(QuoteService svc){ this.svc = svc; }

    @GetMapping("/{ticker}")
    public ResponseEntity<Quote> last(@PathVariable String ticker){
        Optional<Quote> q = svc.last(ticker);
        return q.map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build());
    }
}
