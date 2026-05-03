---
layout: post
title: >
  Modern Construction of Moduli Chain in HEaaN2
date: 2026-04-24 00:00:00-0400
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

- Written by Seonghak Kim (CryptoLab)
- About HEaaN2(https://heaan.io/)

_TL;DR: Every CKKS computation is built upon a sequence of moduli that predetermines the rescaling amount after each multiplication. A new CKKS library, HEaaN2, generalizes the construction of this parameter with a carefully designed scheme and API set. In this article, we break down the traditional construction of the moduli chain to derive the new one._

---

A CKKS circuit essentially requires a sequence of modulus. A CKKS multiplication is may accompanied with a rescaling, and a rescaling reduces a ciphertext to another modulus.
Continued multiplication and rescaling done a ciphertext transfers the modulus of the ciphertext till the modulus is depleted, and a bootstrap restores the modulus back.

A _moduli chain_ is this sequence of moduli, governing the entire lifecycle of a ciphertext.
Notably in many CKKS implementations the moduli chain is baked into a "CKKS Parameter",
meaning it affects not just one ciphertext but every ciphertext in the program,
making it critical for overall performance and memory usage.

In this article, we first review existing models of the moduli chain,
then present a modern construction as implemented in HEaaN2.
Finally, we deconstruct the idea to suggest an extended, chain-free CKKS API set.

## Traditional Construction of Moduli Chain and Its Limits
An early-stage model of the moduli chain is presented in the original RNS-CKKS paper.
Throughout this article, let _level_ denote multiplicative depth.
- Gather $q_i$ to be similar to each other.
- Let the initial modulus $Q = \prod_{i = 1}^\ell q_i$.
- Rescale by $q_i$ at each level.
- Keep the scale roughly stable by setting $\Delta \simeq q_i$ so that $\frac{\Delta^2}{q_i} \approx \Delta$.

Note that this model explicitly chooses an approximate management of scale, trading precision for ease of use.
A more precise variant can be obtained by modifying the scale management as follows.

- Let the scale differ for each level, following the recurrence $\frac{\Delta_i^2}{q_i} = \Delta_{i-1}$.
- Choose $q_i$ appropriately to make $\Delta_{i-1}$ close to the desired value.

This simple, user-familiar model was adopted in the initial designs of many CKKS libraries, including Lattigo, OpenFHE, and HEaaN.
Over time, each implementation improved the model independently to overcome its natural limitations.

As recognized in prior works (BitPacker, Grafting),
the core limitation is the coupling between the RNS system and the rescaling amount (roughly, the scaling factor).
The rescaling amount, set to be close to $q_i$ or $\Delta_i$,
cannot be freely chosen because $q_i$ is a single prime and primes are not conveniently distributed.

This coarse choice leads to the following restrictions.
Note that below we assume RNS-CKKS, which uses the NTT for polynomial multiplication.
- The rescaling amount is tied to $q_i$, and thus cannot exceed a machine word.
- Since $q_i$ must be NTT-friendly, the value also cannot fall below the smallest NTT-friendly prime.
- A 32-bit RNS system suffers from a scarcity of suitable primes.
- If the chain grows long enough, the scale factor can diverge.

## Attempts for Generalized Constructions
Several attempts have been made to generalize the system and overcome the problems above.
They share a common abstraction that redefines the moduli chain in a more general way.
A short formalization of the model is as follows.
- Define $Q_0 < Q_1 < \cdots < Q_L$ as the modulus for each level. $Q_{i-1} \mid Q_i$ is not required.
- Rescaling divides by the ratio $Q_i / Q_{i-1}$.
- The scale follows the recurrence $$\frac{\Delta_i^2}{Q_i / Q_{i-1}} = \Delta_{i-1} \text{.}$$

Since $Q_i / Q_{i-1}$ is no longer restricted to a single NTT-friendly prime, the rescaling amount can be chosen much more freely.
The model is suggested and instantiated in distinct forms by different implementations.

HElib was the first to propose a generalized construction, doing so from the very beginning of its design.
It manages _small primes_ alongside the normal primes,
which are primes dedicated to handle fine-grained adjustement of modulus.
These _small primes_ are precomputed for a target bit resolution,
enabling construction of $Q_i$ at an arbitrary multiple of that resolution.

BitPacker conceptualizes the CKKS adjusting and rescaling operations
and proposes a greedy algorithm to construct a modulus of arbitrary desired bit size.
Like HElib, BitPacker separates _terminal residues_ from non-terminal residues,
but allows variable-length _terminal residues_,
whereas HElib's _small primes_ always occupy up to two machine words.

Grafting formalizes the correctness of CKKS adjusting and rescaling,
and identifies a key-switching problem in generalized moduli chains:
a switching key must be constructed over the LCM of all chain entries,
unless multiple switching keys are instantiated at additional memory cost.
To address this, Grafting introduces the _sprout_, whose divisor can have an arbitrary bit size,
thereby limiting the LCM of the moduli and reducing key size.
See the [article on Grafting](https://ckks.org/blog/2025/grafting/) for more details.

Cheddar utilizes a middle ground between HElib and BitPacker to maximize performance.
In its _25-30 prime system_, the RNS system consists of many 30-bit primes and a few 25-bit primes.
The 25-bit primes are precomputed to provide a predefined resolution as in HElib,
while occupying a variable number of words as in BitPacker.

## The Construction in HEaaN2
The moduli chain construction in HEaaN2 is an intermediate instance of the implementations above,
though the library internally adopts the terminology of Grafting.

Like the prior works, HEaaN2 lets a few designated RNS words absorb the fine-grained bit adjustment
while the remaining words stay at full machine-word size.
Following Grafting, these designated words are called the _sprout_.
We formalize how HEaaN2 uses _sprout_ as below.

> **Definition (Sprout).**
> The _sprout_ of $Q_i$, $S_i$ is a designated pair of words $(q_30, q_X)$ such that
> - $q_30$ is either absent or a 30-bit NTT-friendly prime, and
> - $q_X$ is a prime with $30 \le \lceil\log_2 q_X\rceil \le 59$.

Note that $q_{30}$ contributes 0 or 30 bits and $q_X$ contributes 30–59 bits,
so a sprout can express every bit size from 0 to 59 modulo 60.
By varying the sprout and filling the remaining words with 60-bit primes,
a modulus of arbitrary bit size can be constructed.

Now that a single modulus $Q_i$ of can be constructed as desired,
building the whole moduli chain from a sequence of desired scale factors is straightforward.
- Start from $Q_0$, sized to meet the base-level bits.
- Repeatedly build $Q_{i+1}$ on top of $Q_i$ by updating the sprout and, if needed, appending a full-sized word.
- Pick $q_X$ at each level so that $\Delta_i$ stays close to the desired scale.
  The value of $q_X$ is allowed to differ across $S_i$'s even for the same target bit size.

The resulting construction offers several advantages over its predecessors.
Its overall structure resembles HElib, successfully providing 1-bit resolution as HElib does.
Unlike HElib, however, it chooses $q_X$ dynamically at construction time, making scale divergence far less likely.
Compared to BitPacker, the scheme keeps the number of _terminal values_ small,
so the modulus-switching overhead between adjacent moduli stays low.
A drawback is that the construction requires a 64-bit RNS system and cannot be applied to 32-bit systems, where NTT-friendly primes in the required range are too scarce.

A remaining issue is the switching-key problem raised by Grafting.
HEaaN2 sidesteps this problem at the cost of a small performance overhead on key switching:
it first switches the ciphertext modulus up to the key's modulus,
performs the key switch, then switches the modulus back down to the ciphertext's original modulus.

## Moduli Chain De-Construction
<!-- TODO -->
