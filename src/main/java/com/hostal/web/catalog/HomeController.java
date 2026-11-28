package com.hostal.web.catalog;

import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

import java.time.LocalDate;

import org.springframework.stereotype.Controller;

@Controller
public class HomeController {
  @GetMapping({"/", "/public/index"})
    public String CantidadDPersonas(Model model) {
        model.addAttribute("nombre", "Mundo");
        model.addAttribute("capacidadMaxima", 6); // esto describe la capacidad máxima de personas en el hostal y se puede cambiar según la configuración del hostal
        model.addAttribute("fecha", java.time.LocalDate.now()); // esto describe la fecha actual y se puede cambiar según la fecha real
        model.addAttribute("clima", "Soleado"); // esto describe el clima actual y se puede cambiar según la información del API de clima
        model.addAttribute("temperatura", 25); // esto describe la temperatura actual y se puede cambiar según la información del API de clima
        model.addAttribute("capacidadActual", 3); // esto describe la capacidad actual de personas en el hostal y se puede cambiar según la ocupación actual del hostal
        return "public/index";               // busca templates/saludo.html
    }

    // Página de reserva: solo muestra la plantilla; todavía no recibe ni guarda datos.
    @GetMapping("/reserva")
    public String reserva() {
        return "reserva";                    // templates/reserva.html
    }
}
