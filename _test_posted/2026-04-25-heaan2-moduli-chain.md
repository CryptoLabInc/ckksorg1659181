---
layout: post
title: >
  Modern Construction of Moduli Chain in HEaaN2
date: 2026-05-01 00:00:00-0400
description: >
  TL;DR: Every CKKS computation is built upon a sequence of moduli that predetermines the rescaling amount after each multiplication. A new CKKS library, HEaaN2, generalizes the construction of this parameter with a carefully designed scheme and API set. In this article, we break down the traditional construction of the moduli chain to derive the new one.
author: Seonghak Kim
tags: 
categories:
related_posts: false
toc:
  sidebar: right
giscus_comments: true
---

- Written by Seonghak Kim (CryptoLab Inc.)
- About HEaaN2 (Available at [CODE.HEAAN](https://heaan.io/))

_TL;DR: Every CKKS computation is built upon a sequence of moduli that predetermines the rescaling amount after each multiplication. A new CKKS library, HEaaN2, generalizes the construction of this parameter with a carefully designed scheme and API set. In this article, we break down the traditional construction of the moduli chain to derive the new one._

---

A CKKS circuit essentially requires a sequence of moduli.
Every CKKS entity is scaled up with its own scaling factor,
and multiplying scaled inputs yields a doubly-scaled result.
A rescaling operation is required to restore the original value of the scaling factor,
and this operation reduces the ciphertext modulus.
Continued multiplication and rescaling done on a ciphertext consumes the modulus until the available modulus is exhausted, and a bootstrapping operation restores the modulus back.

A _moduli chain_ is this sequence of moduli, governing the entire lifecycle of a ciphertext.
Notably in many CKKS implementations the moduli chain is treated as a global object in a "CKKS Parameter",
meaning it affects not just one ciphertext but every ciphertext in the program,
making it critical for overall performance and memory usage.

In this article, we first review existing models of the moduli chain,
then present a modern construction as implemented in HEaaN2.
Finally, we outline an extended, chain-free CKKS API relying on ciphertext-based modulus management.

<br />
## Traditional Construction of Moduli Chain and Its Limits
<div style="margin-top: 1.5em;"></div>

An early-stage model of the moduli chain is presented in the original RNS-CKKS paper[^1].
Throughout this article, let _level_ denote multiplicative depth.
- Let $q_i$ be primes which are close to a common value.
- Let the initial modulus $Q = \prod_{i = 1}^\ell q_i$.
- Let the modulus for level $l$ to be $Q_l = \prod_{i = 1}^l q_i$. In other words, rescaling scales down the modulus by $q_i$ at each level.
- During the procedures, the scale is kept roughly stable by setting $\Delta \simeq q_i$ so that ${\Delta^2}/{q_i} \approx \Delta.$

Note that this model explicitly chooses an approximate management of the scaling factor $\Delta$, trading precision for ease of use.
A more accurate variant can be obtained by modifying the scale management as follows.

- Let the scale differ for each level, following the recurrence ${\Delta_i^2}/{q_i} = \Delta_{i-1}$.
- Choose $q_i$ appropriately to make $\Delta_{i-1}$ close to the desired value.

This simple, user-friendly model was adopted in the initial designs of many CKKS libraries, including Lattigo[^2], OpenFHE[^3], and HEaaN[^4].
Over time, each implementation improved the model independently to overcome its natural limitations.

As recognized in prior works (BitPacker[^5], Grafting[^6]),
the core limitation is the coupling between the RNS system and the rescaling amount (roughly, the scaling factor).
The rescaling amount, whose value is $q_i$, cannot be freely chosen because $q_i$ is a single prime and primes are not conveniently distributed.

This coarse choice leads to the following restrictions.
- The rescaling amount is tied to $q_i$, and thus cannot exceed a machine word.
- As NTT is required for efficient polynomial arithmetic,
the primes $q_i$ must be NTT-friendly, hence $\equiv 1 \pmod{2N}$,
requiring $q_i$ to be at least $2N+1$ (and often significantly more).
- The suitable primes that fit into a 32-bit machine word are scarce, so it is hard to construct a stable implementation based on a 32-bit architecture.
- If the chain grows long enough, the scale factor can diverge.

<br />
## Attempts for Generalized Constructions
<div style="margin-top: 1.5em;"></div>

Several attempts have been made to generalize the system and overcome the problems above.
They share a common abstraction that redefines the moduli chain in a more general way.
A short formalization of the model is as follows.
- Define $Q_0 < Q_1 < \cdots < Q_L$ as the modulus for each level. $Q_{i-1} \mid Q_i$ is not required.
- Rescaling divides by the ratio $Q_i / Q_{i-1}$.
- The scale follows the recurrence $${\Delta_i^2}/{(Q_i / Q_{i-1})} = \Delta_{i-1} \text{.}$$

Since $Q_i / Q_{i-1}$ is no longer restricted to a single NTT-friendly prime, the rescaling amount can be chosen much more freely.
The model is suggested and instantiated in distinct forms by different implementations.

HElib[^7] suggests and utilizes a generalized construction, doing so from the very beginning of its design.
It manages _small primes_ alongside the normal primes,
which are primes dedicated to handle fine-grained adjustment of modulus.
These _small primes_ are precomputed for a target bit resolution,
enabling construction of $Q_i$ at an arbitrary multiple of that resolution.

BitPacker[^5] conceptualizes the CKKS adjusting and rescaling operations
and proposes a greedy algorithm to construct a modulus of arbitrary desired bit size.
Like HElib, BitPacker separates _terminal residues_ from non-terminal residues,
but allows variable-length _terminal residues_,
whereas HElib's _small primes_ always occupy up to two machine words.

Grafting[^6] formalizes the correctness of CKKS adjusting and rescaling,
and identifies a key-switching problem in generalized moduli chains:
a switching key must be constructed over the LCM of all chain entries,
unless multiple switching keys are instantiated at additional memory cost.
To address this, Grafting introduces the _sprout_, whose divisor can have an arbitrary bit size,
thereby limiting the LCM of the moduli and reducing key size.
See the [article on Grafting](https://ckks.org/blog/2025/grafting/) for more details.

Cheddar[^8] utilizes a middle ground between HElib and BitPacker to maximize performance.
In its _25-30 prime system_, the RNS system consists of many 30-bit primes and a few 25-bit primes.
The 25-bit primes are precomputed to provide a predefined resolution as in HElib,
while occupying a variable number of words as in BitPacker.

We note that the security of the corresponding CKKS scheme relies on the same
RLWE problem over a ring modulo a large modulus, regardless of the underlying
arithmetic description of how moduli change during homomorphic operations.

<br />
## The Construction in HEaaN2
<div style="margin-top: 1.5em;"></div>

The moduli chain construction in HEaaN2 tries to combine the best features of these various implementations,
though the library internally adopts the terminology of Grafting.

Like the prior works, HEaaN2 lets a few designated RNS words absorb the fine-grained bit adjustment
while the remaining words stay at full machine-word size.
Following Grafting, these designated words are called the _sprout_.
We formalize how HEaaN2 uses _sprout_ as below.

> **Definition (Sprout).**
> The _sprout_ associated with $i$-th modulus (i.e. $Q_i$), $S_i$ is a designated pair of words $(q_{30}, q_X)$ such that
> - $q_{30}$ is either 1 or a 30-bit NTT-friendly prime.
> - $q_X$ is a flexible-bit prime with $30 \le \lfloor\log_2 q_X\rceil \le 59$.

Note that we can find a sprout for any bit size in $\left[30, 89\right]$. By adding as many
60-bit primes as needed, we can thus obtain moduli with any bit-size $\ge 30$ bits.

Now that a single modulus $Q_i$ can be constructed as desired,
building the whole moduli chain from a sequence of desired scale factors is straightforward.
- Start from $Q_0$, sized to meet the base-level bits.
- Repeatedly build $Q_{i+1}$ on top of $Q_i$ by updating the sprout and, if needed, appending a full-sized word.
- Pick $q_X$ at each level so that $\Delta_i$ stays close to the desired scale.
  The value of $q_X$ is allowed to differ across $S_i$'s even for the same target bit size.

The resulting construction offers several advantages over its predecessors.
Its overall structure resembles HElib, successfully providing a 1-bit resolution as HElib does.
Unlike HElib, however, it chooses $q_X$ dynamically at construction time, making scale divergence far less likely.
Compared to BitPacker, the scheme keeps the number of _terminal values_ small,
so the modulus-switching overhead between adjacent moduli stays low.
A drawback is that the construction requires a 64-bit RNS system and cannot be applied to 32-bit systems, where NTT-friendly primes in the required range are too scarce.

A remaining issue is the switching-key problem raised by Grafting[^6].
HEaaN2 adopts a pragmatic solution suggested in the same paper:
it first switches the ciphertext modulus up to the key's modulus,
performs the key switch, then switches the modulus back down to the ciphertext's original modulus.
This yields a simple solution, at the expense of a small performance overhead on key-switching.

In HEaaN2, the concept of moduli chain is represented by a class named `Levels`.
This class contains two fields, one being the sequence of moduli (the moduli chain),
the other one being the corresponding sequence of scales.
The class can be handed to computing modules (e.g. `HomEval`) to inform which moduli chain to use during a computation.
Notably, the API separates a moduli chain from a full CKKS parameter set,
allowing a CKKS program to have multiple moduli chains.
More details can be found at [the HEaaN2 documentation](https://cryptolab.gitbook.io/heaan2/api-reference/metadata/levels).

```cpp
struct HEAAN2_API Levels {
    std::vector<PolyMod> mods;
    std::vector<Real128> scales;
};
```

HEaaN2 also offers an utility to automatically construct a moduli chain, named `LevelsBuilder`.
A notable point on the utility is that it accepts the bit-size of a modulus as an argument,
thanks to the _sprout_'s capability to express any bits.
Details of the class and an example usage can be found at [the corresponding documentation](https://cryptolab.gitbook.io/heaan2/basics/custom-parameters#levelsbuilder).

<br />
## Towards a Moduli-Chain Free CKKS
<div style="margin-top: 1.5em;"></div>

Though the moduli chain is a natural structure for CKKS computations,
it also creates rigidity in complex circuits.
As an example, when the required precision per multiplication varies,
the rescaling amount can be finely adjusted to reduce modulus consumption.
A natural idea is to try to get rid of the global moduli chain and move to a ciphertext-based modulus management.

Recall that the moduli chain was derived from an alternating sequence of multiplication and rescaling.
To support non-standard operation sequences—such as consecutive multiplications without rescaling —a more general system for managing modulus and scale is needed.
In this section, we specify such a system. Note that this is not a new idea; CKKS has never restricted its operation sequence,
and what follows is one point in its vast design space.

We begin by letting the domain be all ciphertexts and plaintexts encoded under an arbitrary modulus and scale.
Write $\mathrm{Enc}_s(m, Q, \Delta)$ for the set of ciphertexts encrypting message $m$ under secret $s$ with modulus $Q$ and scale $\Delta$.
The elementary CKKS operations are then defined as follows.

- **Addition.** For $ct_1 \in \mathrm{Enc}_s(m_1, Q, \Delta)$ and $ct_2 \in \mathrm{Enc}_s(m_2, Q, \Delta)$,

  $$\mathrm{Add}(ct_1, ct_2) \in \mathrm{Enc}_s(m_1 + m_2,\; Q,\; \Delta).$$

- **Multiplication.** For $ct_1 \in \mathrm{Enc}_s(m_1, Q, \Delta_1)$ and $ct_2 \in \mathrm{Enc}_s(m_2, Q, \Delta_2)$,

  $$\mathrm{Mul}(ct_1, ct_2) \in \mathrm{Enc}_s(m_1 \cdot m_2,\; Q,\; \Delta_1 \cdot \Delta_2).$$

- **Scalar-Multiplication.** For $ct_1 \in \mathrm{Enc}_s(m_1, Q, \Delta_1)$, $c_2 \in \mathbb{C}$ and $\Delta_2$,

  $$\mathrm{SMul}(ct_1, c_2, \Delta_2) \in \mathrm{Enc}_s(m_1 \cdot c_2,\; Q,\; \Delta_1 \cdot \Delta_2).$$

- **Rescaling.** For $$ct \in \mathrm{Enc}_s(m, Q, \Delta)$$ and a modulus $$Q_{to}$$,

  $$\mathrm{Rescale}(ct, Q_{to}) \in \mathrm{Enc}_s(m, Q_{to}, \frac{\Delta}{Q / Q_{to}}).$$

Note that multiplication can be decomposed into tensor product and relinearization, but we omit the details here.
Likewise, scalar-multiplication is a concatenation of encoding $c_2$ at scale $\Delta_2$ and multiplying.

The usual, moduli-chain based CKKS behaviour can be emulated using these operations.
However, additional primitives exist that enable CKKS circuits beyond what a fixed chain can express.
- **Setting Scale.** For $$ct \in \mathrm{Enc}_s(m, Q, \Delta)$$ and a new scale $$\Delta_{to}$$,
  $$\mathrm{SetScale}(ct, \Delta_{to}) \in \mathrm{Enc}_s(m \cdot \Delta / \Delta_{to},\; Q,\; \Delta_{to}).$$
  This does not change the polynomial, but merely sets the scale to a different value, with the effect of
multiplying the underlying message by a factor $\Delta / \Delta_{to}$.
- **Adjusting.** For $$ct \in \mathrm{Enc}_s(m, Q, \Delta)$$, a target modulus $$Q_{to}$$ and target scale $$\Delta_{to}$$,
  $$\mathrm{Adjust}(ct, Q_{to}, \Delta_{to}) \in \mathrm{Enc}_s(m,\; Q_{to},\; \Delta_{to}).$$
  This switches the modulus and scale while preserving the message.

Notably, these two operations together can align the moduli and scales of multiple ciphertexts,
so that they become compatible operands for subsequent additions or multiplications.

Adjust may seem unfamiliar, but it is essentially a scalar-multiplication that compensates the modulus ratio, followed by a rescaling.
Although the operation offers considerable flexibility, it remains precise only when $Q_{to}$ is sufficiently smaller than $Q$.

The deconstructed system opens a vast design space for fine-grained optimizations,
but in return, the user bears the burden of navigating that space—manually
tracking every modulus and scale that a moduli chain would otherwise manage.
In practice, the chain-free primitives are most useful alongside the ordinary ones:
run standard leveled operations within a chain, and invoke non-leveled operations only to transfer between chains or to execute a specially optimized sub-circuit.

<div class="row mt-3">
    <div class="col-sm-10 mt-3 mt-md-0 mx-auto d-block">
        {% include figure.liquid loading="eager" path="assets/img/blog/2605_Seonghak/HPBootCircuit.png" class="img-fluid rounded z-depth-1" zoomable=true %}
    </div>
</div>
<div class="caption">
    The Computation Circuit of High-precision Bootstrapping. <br>
    $Q_{stc}$, $Q_0$, $Q_{lpcts}$, $Q_{em}$, $Q_{hpcts}$, $Q_{bts}$ stand for the moduli of the ciphertexts on respective steps. <br>
    $\Delta_{stc}$, $\Delta_0$, $\Delta_{lpcts}$, $\Delta_{em}$, $\Delta_{hpcts}$, $\Delta_{bts}$ are corresponding scale factors.
</div>

An eager usage of chain-free operations can be found in the high-precision bootstrapping circuit from CKSS25[^9].
The circuit uses the standard moduli chain piecewise, inside each module (e.g. SlotToCoeff, CoeffToSlot),
and two chains do diverge, then converge back through various chain-free operations.

HEaaN2 provides a subset of these chain-free primitives and illustrates them through [a `Cleaning` example](https://cryptolab.gitbook.io/heaan2/advanced/cleaning): iterative cubic multiplication whose rescaling amount differs at every iteration.
The example compares the execution with the naive chain-full variant, to emphasize the practical gain of managing modulus and scale outside a fixed chain.

<br />
## Conclusion
<div style="margin-top: 1.5em;"></div>

The moduli chain is a fundamental parameter of CKKS, but its traditional construction—a single fixed sequence baked into the program—is unnecessarily rigid for aggressive optimizations.
Improvements by HElib, BitPacker, and Grafting have refined the chain construction, but they still operate within the framework of a predetermined sequence.
HEaaN2 deconstructs the chain into independent modulus and scale management,
and this approach gives a very flexible way to express complex CKKS circuits (diverging chains, variable rescaling, cross-chain transfers) and allow expert users to perform fine-grained optimization of modulus usage.

<br />
## References
<div style="margin-top: 1.5em;"></div>


[^1]: J. H. Cheon, K. Han, A. Kim, M. Kim, and Y. Song. ["A Full RNS Variant of Approximate Homomorphic Encryption."](https://ia.cr/2018/931) SAC 2018. 
[^2]: EPFL-LDS, Tune Insight SA. ["A Library for Lattice-based Homomorphic Encryption in Go."](https://github.com/tuneinsight/lattigo) 
[^3]: A. Al Badawi, J. Bates, F. Bergamaschi, et al. ["OpenFHE: Open-Source Fully Homomorphic Encryption Library."](https://ia.cr/2022/915) WAHC 2022. 
[^4]: CryptoLab Inc. ["HEaaN Library."](https://heaan.it/) 
[^5]: N. Samardzic and D, Sanchez. ["Bitpacker: Enabling High Arithmetic Efficiency in Fully Homomorphic Encryption Accelerators."](https://dl.acm.org/doi/10.1145/3620665.3640397) ASPLOS 2024. 
[^6]: J. H. Cheon, H. Choe, M. Kang, J. Kim, S. Kim, J. Mono, and T. Noh. ["Grafting: Decoupled Scale Factors and Modulus in RNS-CKKS."](https://ia.cr/2024/1014) ACM CCS 2025. 
[^7]: S. Halevi and V. Shoup. ["Design and Implementation of HElib: A Homomorphic Encryption Library."](https://ia.cr/2020/1481) IACR ePrint Archive.
[^8]: W. Choi, J. Kim and J. Ahn ["Cheddar: A Swift Fully Homomorphic Encryption Library Designed for GPU Architectures."](https://dl.acm.org/doi/abs/10.1145/3760250.3762223) ASPLOS 2026.
[^9]: H. Choe, J. Kim, D. Stehlé, E. Suvanto ["Leveraging Discrete CKKS to Bootstrap in High Precision."](https://ia.cr/2025/1786) ACM CCS 2025.