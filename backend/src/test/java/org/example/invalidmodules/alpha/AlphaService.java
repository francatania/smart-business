package org.example.invalidmodules.alpha;

import org.example.invalidmodules.beta.internal.BetaInternalType;

public class AlphaService {

    private final BetaInternalType beta;

    public AlphaService(BetaInternalType beta) {
        this.beta = beta;
    }

    public BetaInternalType beta() {
        return beta;
    }
}
