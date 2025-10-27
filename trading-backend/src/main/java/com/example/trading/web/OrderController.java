package com.example.trading.web;

import com.example.trading.model.Order;
import com.example.trading.model.Order.Side;
import com.example.trading.service.OrderService;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/orders")
public class OrderController {
    private final OrderService svc;
    public OrderController(OrderService svc){ this.svc = svc; }

    public static record PlaceOrderDto(
            @NotBlank String user,
            @NotBlank String ticker,
            @NotNull Side side,
            @Min(1) int quantity,
            BigDecimal limitPrice
    ){}

    @PostMapping
    public Order place(@RequestBody PlaceOrderDto dto){
        return svc.place(dto.user(), dto.ticker(), dto.quantity(), dto.limitPrice(), dto.side());
    }

    @GetMapping
    public List<Order> all(){ return svc.all(); }
}
