package com.example.trading.web;

import com.example.trading.service.QuoteService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/symbols")
public class SymbolController {
    private final QuoteService quotes;
    public SymbolController(QuoteService quotes){ this.quotes = quotes; }

    @GetMapping public List<String> symbols(){ return quotes.symbols(); }
}
