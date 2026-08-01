package br.tourapp.kyr.poi.exception;

public class GoogleMapsIntegrationException extends RuntimeException {

    public GoogleMapsIntegrationException(String message) {
        super(message);
    }

    public GoogleMapsIntegrationException(String message, Throwable cause) {
        super(message, cause);
    }
}
