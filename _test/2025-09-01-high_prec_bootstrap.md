---
layout: post
title: >
  Leveraging Discrete CKKS to Bootstrap in High Precision
date: 2025-09-01 11:12:00-0400
description: >
  TL;DR: In CKSS25, a new high-precision CKKS bootstrapping method was introduced. It leverages a novel Integer Cleaning strategy inspired by the Discrete CKKS technique and is implemented using the Grafting technique. We highlight its main building blocks and discuss its efficiency.
author: Hyeongmin Choe
tags: 
categories: 
related_posts: false
toc:
  sidebar: right
---

- Written by [Hyeongmin Choe](https://hmchoe0528.github.io) (CryptoLab)
- Based on [https://ia.cr/2025/????](https://ia.cr/2025/????) (CCS 2025)

_TL;DR: In CKSS25, a new high-precision CKKS bootstrapping method was introduced. It leverages a novel Integer Cleaning strategy inspired by the Discrete CKKS technique and is implemented using the Grafting technique. We highlight its main building blocks and discuss its efficiency._

---

<br />
## Why High-Precision Bootstrapping Matters

CKKS bootstrapping aims to refresh ciphertexts by increasing their modulus while preserving the encrypted message, enabling further homomorphic computations. 
However, bootstrapping introduces an approximation error.
Most existing implementations achieve _5–25 bits_ of precision, where the bit-precision can be defined as the negative base-2 logarithm of the worst-case error, measured across many runs. 

Some advanced applications, however, require much smaller error to support stronger security properties such as _Circuit Privacy_ and _IND-CPA-D_ Security. 
It is also important for Threshold-FHE (see [this blogpost](https://ckks.org/blog/2025/threshold/)). 
These are often achieved via noise flooding—adding large noise relative to the error before decryption—which blinds the secret-dependent error terms but also the lower bits of the message. 
To retain precision after flooding, the pre-flooding precision must be higher, typically _64–80 bits_ or more. 


<div class="row mt-3">
    <div class="col-sm-7 mt-3 mt-md-0 mx-auto d-block">
        {% include figure.liquid loading="eager" path="assets/img/blog/2510_Hyeongmin/image0.png" class="img-fluid rounded z-depth-1" zoomable=true %}
    </div>
</div>


Supporting such high precision securely and efficiently is a key challenge in CKKS bootstrapping. 
In LLK+22[^1], a high-accuracy polynomial approximation for modular reduction $$x \mapsto (x \bmod q)$$ was introduced.
This approximation enables high-precision CKKS bootstrapping, though it incurs enormous modulus consumption.
BCC+22[^2] introduced Meta-BTS, which achieves high precision by performing multiple sequential low-precision bootstrapping, 
at the cost of increased latency linear in the target precision. 
This approach also requires slightly higher modulus consumption.

<br />
## EvalRound+ Paradigm for High Precision

We follow the **EvalRound+** paradigm as the first building block of high-precision CKKS bootstrapping.  
It differs slightly from the traditional CKKS bootstrapping. 
Let's first recall the traditional CKKS bootstrapping pipeline:

$$\text{ModRaise} \rightarrow \text{CoeffsToSlots} \rightarrow \text{EvalMod} \rightarrow \text{SlotsToCoeffs}.$$

Alternatively, one can place SlotsToCoeffs at the beginning. 
Here, we focus on the ModRaise-first variant, as the technical details are equivalent.

The _EvalRound+_ paradigm, introduced in SSKM24[^3], replaces EvalMod with a subroutine called EvalRound and branches into two parallel tracks.
EvalRound was originally defined in KPK+22[^4] as $$\text{EvalRound} = \text{Id} - \text{EvalMod}.$$
That is, while EvalMod extracts the message $$m$$ from $$m + q_0 I$$, EvalRound extracts $$q_0 I$$. 
Here, the message $$m$$ is a plaintext, encoding a complex vector with a scale factor.

The EvalRound+ procedure begins with ModRaise and then splits into two tracks:
- the first track applies the standard CoeffsToSlots algorithm, and
- the second track uses a low-precision CoeffsToSlots* followed by EvalRound. 

Then it subtracts the two resulting ciphertexts, and concludes with SlotsToCoeffs. 

The two branches produce ciphertexts encrypting $$m + q_0 I$$ and $$q_0 I$$, respectively; 
subtracting them yields a ciphertext encrypting $$m$$, which is then passed through SlotsToCoeffs to return to coefficient representation.
Although the dual-track structure increases latency, it reduces modulus consumption, since only the second track dictates the modulus consumption and CoeffsToSlots* consumes much less modulus than the usual CoeffsToSlots algorithm.

To enable high-precision bootstrapping, one can upgrade CoeffsToSlots, EvalRound, and SlotsToCoeffs to their high-precision versions. 
Each requires larger scale factors, increasing modulus consumption. 
By contrast, CoeffsToSlots* can remain low-precision and consumes significantly less modulus compared to the other bootstrapping components. 
This marks a key distinction from standard CKKS bootstrapping, where the high-precision CoeffsToSlots contributes to overall modulus consumption.

The main challenge is that high-precision bootstrapping still requires substantial modulus.
In particular, EvalMod and EvalRound rely on polynomial approximations of $$(x \bmod q)$$ and $$(x - (x \bmod q))$$, respectively. 
Achieving higher accuracy requires higher-degree polynomials, whose multiplicative depth grows as $$\Theta(\log t)$$, where $$t$$ is the target bit-precision. 
Since scale factors grow as $$\Theta(t)$$, overall modulus consumption typically scales as $$\Theta(t \log t)$$.

<br />
## Integer Cleaning from Discrete CKKS

Let’s take a closer look at the EvalRound procedure. 
When treating $$q_0$$ as a new scale factor, EvalRound maps $$(I+m/q_0) \mapsto I$$.
More precisely, an erroneous integer $$I + \varepsilon$$ is mapped to a (much less) erroneous integer $$I + \varepsilon'$$ where $$\varepsilon := m/q_0$$ and $$\varepsilon' \ll \varepsilon$$. 
As it _cleans_ a noisy integer, we may call this functionality **Integer Cleaning**. 

To reduce modulus consumption in high-precision bootstrapping, 
CKSS25[^7] introduces a novel Integer Cleaning algorithm based on this idea. 

The process involves:

1. **Digit Extraction**: Decompose the noisy integer $$I+\varepsilon$$ into base-$$\beta$$ digits:
  For $$I = \sum_{i=0}^{\ell} I_i \beta^i,$$ each noisy digit $$I_i + \varepsilon_i$$ is extracted and stored separately. This can be done by either:
   - via Direct polynomial approximation, mapping $$I \in [-K, K] \mapsto I_i \in [0, \beta)$$, or
   - mapping $$I$$ into $$\exp(2i\pi I / \beta^\gamma)$$, the complex $$\beta^\gamma$$-th roots of unity (as in CKKL24[^5]), and decomposing the digits via interpolation (as in BKSS24[^6]).
2. **Iterative Digit Cleaning**: Apply low-degree polynomials iteratively to each noisy digit $$I_i$$, to refine its precision:
   - ($$\beta = 2$$) $$h_1(x) = 3x^2 - 2x^3$$ from CKK20[^8], or
   - ($$\beta = 3$$) $$\frac{1}{3}(\bar{x}^2 + 4x - 2x^2\bar{x})$$ from BKSS24[^6].
   
   These polynomials quadratically clean the bits or trits, refining a $$t$$-bit precision to around $$2t$$-bit.
   In the end, it returns the cleaned digits $$I_i + \varepsilon'_i$$ with $$\varepsilon'_i \ll \varepsilon_i$$. 
   Note that for each iteration, the scale factor must be large enough to support the cleaned digit, which roughly squares after each iteration. 
   This implies that early iterations (and Digit Extraction) can use much smaller scale factors (e.g., 25–35 bits) than the desired integer cleaning precision. 
3. **Recombination**: Combine the cleaned digits $$I_i + \varepsilon'_i$$ to reconstruct the cleaned integer $$I + \varepsilon'$$. 
  This requires only integer multiplications and additions, with no extra modulus consumption.  


Suppose the input $$I + \varepsilon$$ to the the Integer Cleaning algorithm has $$t$$-bit precision (i.e., $$|\varepsilon| \leq 2^{-t}$$).
Then, with $$\text{iter}$$ iterations of Digit Cleaning, the algorithm outputs an integer with $$\Theta(2^{\text{iter}} \cdot t)$$ bits of precision.

<br />
## Grafting

When the high precision Integer Cleaning algorithm is integrated into the EvalRound+ paradigm, the small scale factors used in the first digit-cleaning step can also be used in CoeffsToSlots*, yielding substantial modulus savings. 

However, the small scale factors typically introduce many small RNS factors, which can degrade performance. 
In CKKS, the ciphertext modulus is usually tied to scale factors, so smaller scale factors naturally increase the number of RNS moduli and slow down the homomorphic computations.

**Grafting**[^9], however, breaks this coupling and constructs the ciphertext modulus as a product of mostly word-size factors, independent of the scale factors. 
This keeps the number of RNS moduli constant, regardless of the scale factor sizes.  
As a result, Grafting enables the use of small scale factors _without performance degradation_, leading to a modulus-efficient and high-performance bootstrapping. 
For further details on RNS-CKKS and Grafting, see [this blogpost](https://ckks.org/blog/2025/grafting).

<br />
## Putting It All Together

The new CKKS bootstrapping proposed in CKSS25[^7] is built on the EvalRound+ paradigm with the Integer Cleaning strategy and employs the Grafting technique.
We note that the Integer Cleaning parts can be further optimized using the **Thrfity** approach; we leave the details to CKSS25[^7].

<div class="row mt-3">
    <div class="col-sm-7 mt-3 mt-md-0 mx-auto d-block">
        {% include figure.liquid loading="eager" path="assets/img/blog/2510_Hyeongmin/final_bar.jpeg" class="img-fluid rounded z-depth-1" zoomable=true %}
    </div>
</div>

<br />
In our proof-of-concept implementation, we used a ring dimension of $$N=2^{16}$$ with full-slot messages.
With bit decomposition ($$\beta = 2$$), the direct approximation method for bit extraction, and three iterations of bit-cleaning, 
our bootstrapping achieved 81 bits of precision. 
We compared this with Meta-BTS, which requires four sequential bootstraps to reach similar accuracy.
Our bootstrapping achieved a **1.64× speedup**, while still leaving 494 bits available for homomorphic computations. 

We note that the bootstrapping scales naturally with the desired precision, thanks to its iterative nature.
By adjusting the number of digit-cleaning iterations, one can flexibly target either lower or higher bootstrapping precisions.
For instance, adding one more iteration yields roughly 150 bits of precision still at $$N=2^{16}$$, with only a modest increase in latency. 

In summary, the new bootstrapping method, combining EvalRound+, Integer Cleaning, and Grafting, enables high-precision CKKS bootstrapping that is modulus-efficient and high-performance, offering a practical solution for advanced homomorphic encryption applications.

<br />
## References

[^1]: Y. Lee, J. Lee, Y. Kim, Y. Kim, J. No, and H. Kang. ["High-Precision Bootstrapping for Approximate Homomorphic Encryption by Error Variance Minimization."](https://ia.cr/2020/1549) Eurocrypt 2022. 
[^2]: Y. Bae, J. H. Cheon, W. Cho, J. Kim, and T. Kim. ["META-BTS: Bootstrapping Precision Beyond the Limit."](https://ia.cr/2022/1167) ACM CCS 2022. 
[^3]: H. Sung, S. Seo, T. Kim, and C. Min. ["EvalRound+ Bootstrapping and its Rigorous Analysis for CKKS Scheme."](https://ia.cr/2024/1379) ePrint Archive 2024. 
[^4]: S. Kim, M. Park, J. Kim, T. Kim, and C. Min. ["EvalRound Algorithm in CKKS Bootstrapping."](https://ia.cr/2022/1256) Asiacrypt 2022. 
[^5]: H. Chung, H. Kim, Y. Kim, and Y. Lee. ["Amortized Large Look-up Table Evaluation with Multivariate Polynomials for Homomorphic Encryption."](https://ia.cr/2024/274) ePrint Archive 2024. 
[^6]: Y. Bae, J. Kim, D. Stehlé, and E. Suvanto. ["Bootstrapping Small Integers With CKKS."](https://ia.cr/2024/1637) Asiacrypt 2024. 
[^7]: H. Choe, J. Kim, D. Stehlé, and E. Suvanto. ["Leveraging Discrete CKKS to Bootstrap in High Precision."](https://ia.cr/2025/????) ACM CCS 2025. 
[^8]: J. H. Cheon, D. Kim, and D. Kim. ["Efficient Homomorphic Comparison Methods with Optimal Complexity."](https://ia.cr/2019/1234) Asiacrypt 2020. 
[^9]: J. H. Cheon, H. Choe, M. Kang, J. Kim, S. Kim, J. Mono, and T. Noh. ["Grafting: Decoupled Scale Factors and Modulus in RNS-CKKS."](https://ia.cr/2024/1014) ACM CCS 2025. 



<!--
### (Done) Validation of 150-bit argument via hueristic analysis (only for internal confirmation). 

Baseline: say, Direct3Cln81 -> Goal: Direct4Cln149
- bottom: 112 -> 112 + 68
- stc: 188 -> 188 + 68*2
- cts_lp: 93
- Int2Bits: 212
- CleanBits: 190 (= 7+46+58+79) -> 298 (= 8+47+53+74+116)

Note for CleanBits, numbers for log2 Delta (or log2 mod) and bit-precisions.
- Original CleanBits: 36 -> 29 (7)   for 15-bit
  - Cln1: 46 = 29*3-41               for 28-bit
  - Cln2: 58 = 41*3-66               for 53-bit
  - Cln3: 79 = 66*3-118              for 103-bit -> 81-bit (Delta=100)
- Modified CleanBits: 36 -> 28 (8)   for 14-bit
  - Cln1: 47 = 28*3-37               for 24-bit
  - Cln2: 53 = 37*3-58               for 45-bit
  - Cln3: 74 = 58*3-100              for 87-bit
  - Cln4: 116 = 100*3-184            for 171-bit -> 149-bit (Delta=168)

-> Available mod: 494 - 68*3 - (298-190) = 182
-->