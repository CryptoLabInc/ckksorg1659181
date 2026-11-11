---
layout: post
title: >
  Recent Advances in Threshold FHE: t-out-of-n Decryption and Distributed Key Generation
date: 2026-11-04 00:00:00-0000
description: >
  TL;DR: We study t-out-of-n threshold FHE, in which any t out of n parties can decrypt. When the set of decryptors is fixed before decryption (synchronous setting), we show that prior efficient schemes are vulnerable to key-recovery attacks when honest parties partially decrypt the same ciphertext for different sets of decryptors, e.g., when decryption is retried after a party drops out, and we fix them at essentially no cost using pseudorandom masks. When it is not (asynchronous setting), we give Shamir-based constructions over BFV, BGV and CKKS with significantly smaller moduli, as well as the first Shamir-based construction achieving strong simulation security. Finally, we show how to generate threshold-CKKS keys without a trusted dealer, while keeping bootstrapping as efficient as in single-key CKKS.
author: Alain Passelègue
tags:
categories:
related_posts: false
toc:
  sidebar: right
giscus_comments: true
---

- Written by [Alain Passelègue](https://perso.ens-lyon.fr/alain.passelegue/index.html) (CryptoLab Inc.)
- Based on [https://eprint.iacr.org/2026/031](https://ia.cr/2026/031) (CCS 2026), [https://eprint.iacr.org/2026/973](https://ia.cr/2026/973) (extended version of a CRYPTO 2026 paper), and [https://eprint.iacr.org/2025/2057](https://ia.cr/2025/2057) (CCS 2026)

_TL;DR: We study t-out-of-n threshold FHE, in which any t out of n parties can decrypt. When the set of decryptors is fixed before decryption (synchronous setting), we show that prior efficient schemes are vulnerable to key-recovery attacks when honest parties partially decrypt the same ciphertext for different sets of decryptors, e.g., when decryption is retried after a party drops out, and we fix them at essentially no cost using pseudorandom masks. When it is not (asynchronous setting), we give Shamir-based constructions over BFV, BGV and CKKS with significantly smaller moduli, as well as the first Shamir-based construction achieving strong simulation security. Finally, we show how to generate threshold-CKKS keys without a trusted dealer, while keeping bootstrapping as efficient as in single-key CKKS._

---


## Threshold decryption, from n-out-of-n to t-out-of-n

In a [previous post](https://ckks.org/blog/2025/threshold/), we discussed Threshold Fully Homomorphic Encryption (ThFHE) in the $n$-out-of-$n$ setting, in which all parties must take part in decryption. Here, we consider the more general $t$-out-of-$n$ setting: the decryption key is split between $n$ parties so that any $t$ of them can decrypt, while any coalition of at most $t-1$ parties learns nothing about encrypted data. This matters in practice: in the $n$-out-of-$n$ setting, a single party that is offline or uncooperative suffices to block decryption. We present three recent works: two on threshold decryption, depending on whether decryptors are synchronized or not, and one on generating the keys without a trusted dealer.

We recall that a ThFHE scheme is a tuple *(KeyGen, Enc, Eval, PartDec, FinDec)*, except that *KeyGen* now outputs $n$ secret key shares $s_1, \dots, s_n$, and that *FinDec* combines partial decryptions from any $t$ distinct parties. We focus on RLWE-based schemes such as BFV, BGV and CKKS, whose ciphertexts are, up to the encoding of the plaintext, pairs $(a,b)$ of elements of $R_q = \mathbb{Z}_q[X]/(X^N+1)$ satisfying 

$$as+b = \Delta m + e,$$ 

where $s$ is the secret key, $m$ is the plaintext, and $e$ is a small error. Decryption is linear in $s$, up to a final rounding or decoding step.

To distribute decryption, the secret key is shared using a linear secret sharing scheme: for any set $S$ of $t$ parties, there exist public coefficients $\lambda_i^S$ such that $s = \sum_{i \in S} \lambda_i^S s_i$. The canonical choice is Shamir secret sharing: one samples a random polynomial $P$ of degree $t-1$ over $R_q$ such that $P(0) = s$, and gives $s_i = P(\alpha_i)$ to party $i$, for public interpolation points $\alpha_1, \dots, \alpha_n$. The reconstruction coefficients are then the Lagrange coefficients $\lambda_i^S = \prod_{j \in S, j \neq i} \alpha_j / (\alpha_j - \alpha_i)$, and each party holds a single ring element, which is as compact as it gets. As in the $n$-out-of-$n$ case, party $i$ partially decrypts $(a,b)$ by publishing $p_i = a s_i + e_i$, where $e_i$ is a flooding error, and *FinDec* computes:

$$
b + \sum_{i \in S} \lambda_i^S p_i = \Delta m + e + \sum_{i \in S} \lambda_i^S e_i .
$$

This is where things go wrong: Lagrange coefficients are fractions modulo $q$, and they have no reason to be small. The flooding errors get multiplied by huge coefficients, and decryption fails.

Two workarounds were proposed in [BGG+18]. The first one keeps Shamir secret sharing, but scales the flooding errors by a public integer $D$ (e.g., a power of $n!$ for $\alpha_i = i$) such that $D \lambda_i^S$ is an integer for all $i$ and $S$. The decryption error is then small over the integers... but not that small: the bit-size of the modulus must grow as $\Omega(\lambda + n \log n)$, where $\lambda$ is the security parameter, or as $\Omega(\lambda + n)$ for well-chosen interpolation points [BFM+25], i.e., hundreds of extra bits even for moderate values of $n$. The second workaround uses a linear secret sharing scheme with reconstruction coefficients in $\lbrace 0, 1 \rbrace$: the decryption error remains small, but the most compact such schemes give $O(n^{4.2})$ ring elements to each party. Neither approach gets close to the performance of single-key FHE as $t$ and $n$ grow.

How to escape this dilemma depends on the decryption model:

- in the **synchronous** setting, the set $S$ of $t$ decryptors is known to the parties when they compute their partial decryptions, e.g., because they agreed on it beforehand or because a coordinator selected them;
- in the **asynchronous** setting, which is the one considered in [BGG+18] and in most subsequent works, each party computes its partial decryption without knowing who else will participate, and any $t$ partial decryptions can be combined.

<div class="row mt-3">
    <div class="col-sm-12 mt-3 mt-md-0 mx-auto d-block">
        {% include figure.liquid loading="eager" path="assets/img/blog/2611_Alain/1.png" class="img-fluid rounded z-depth-1" zoomable=true %}
    </div>
</div>
<div class="caption">
    Figure 1: Synchronous vs. asynchronous threshold decryption with $t = 3$ out of $n = 5$ parties.
</div>

## The synchronous setting

When parties know $S$, the problem seems to disappear, as already hinted at in a footnote of [BGG+18]: party $i$ can include its own Lagrange coefficient in its partial decryption, i.e., publish $p_i^S = \lambda_i^S a s_i + e_i$, so that partial decryptions simply add up:

$$
b + \sum_{i \in S} p_i^S = \Delta m + e + \sum_{i \in S} e_i .
$$

The flooding errors no longer mingle with the Lagrange coefficients: as in the $n$-out-of-$n$ setting, roughly $\lambda/2 + O(\log n)$ extra bits of modulus suffice. Unsurprisingly, practical works such as [MBH23] and Helium [MCPT24] focus on this setting.

**Defining security.** Yet, ThFHE in the synchronous setting had not been properly defined (a syntax is given in [GKS24], but with a very weak security notion). In [CPS26], *PartDec* takes the target set of decryptors $S$ as an additional input, and security must hold even when an honest party partially decrypts the same ciphertext for different target sets. This is not a corner case: if a party of $S$ goes offline before sending its partial decryption (a situation called *churn* in [MCPT24]), the other parties naturally retry with a new set $S'$, thereby revealing partial decryptions of the same ciphertext for both $S$ and $S'$. We propose two security notions. In the weak one, $S$ is merely an enabler of efficiency: partial decryptions most reveal nothing about the key shares of honest parties, but any $t$ partial decryption shares of a ciphertext might leak the underlying plaintext (even if they are not all crafted for the same set of decryptors). The strong one binds partial decryptions to their target set: as long as the adversary does not hold the partial decryptions of a ciphertext by *all* the parties of some set $S$ (via corruptions or decryption queries), it learns nothing about the underlying plaintext, even if it has collected many more than $t$ partial decryptions of this ciphertext for different sets.

**Attacks on prior schemes.** It turns out that the schemes from [MBH23] and [MCPT24] do not even satisfy the weak notion. Let us sketch our key-recovery attack against the simple scheme above. The attacker uses a single ciphertext $(a, b)$, e.g., an encryption of $0$, and asks an honest party, say party $1$, for partial decryptions for target sets $S_0 = S^\ast \cup \lbrace i_0 \rbrace$ and $S_1 = S^\ast \cup \lbrace i_1 \rbrace$, which differ in a single party ($S^\ast$ contains party $1$ and $t-2$ other parties). The key observation is that, when the interpolation points are small integers, the ratio between the Lagrange coefficients of party $1$ for $S_0$ and $S_1$ is a ratio of small integers:

$$
\frac{\lambda_1^{S_0}}{\lambda_1^{S_1}} = \frac{\alpha_{i_0} (\alpha_1 - \alpha_{i_1})}{\alpha_{i_1} (\alpha_1 - \alpha_{i_0})} = \frac{\beta}{\gamma} .
$$

For instance, for the common choice $\alpha_i = i$ and for $i_0 = 2$, we get $\beta = -2(i_1 - 1)$ and $\gamma = -i_1$, which are coprime when $i_1$ is odd. The attacker then computes:

$$
\gamma p_1^{S_0} - \beta p_1^{S_1} = \gamma e_0 - \beta e_1 \bmod q ,
$$

where $e_0$ and $e_1$ are the flooding errors of the two partial decryptions: the terms in $a s_1$ cancel out. The right-hand side is small compared to $q$, so this equality holds over the integers, and reducing it modulo $\beta$ reveals $e_0 \bmod \beta$. Repeating with other values of $i_1$ gives $e_0$ modulo many small integers and, when $n$ is large enough, the Chinese Remainder Theorem then gives $e_0$, hence $s_1$, and finally the secret key $s$, using the $t-1$ key shares of corrupted parties.

Refusing to decrypt the same ciphertext twice does not help: after obtaining a partial decryption of $\mathsf{ct}$ for $S_0$, the attacker can request partial decryptions of $\mathsf{ct} + \mathsf{ct}'$ and of $\mathsf{ct}'$ for $S_1$, for any ciphertext $\mathsf{ct}'$, and subtract them. Helium [MCPT24] explicitly aims at handling churn, by having decryptors add to the ciphertext an encryption of $0$ derived from $S$, so that decrypting for different sets amounts to decrypting different ciphertexts. However, all decryptors must derive the very same encryption of $0$ from public data, so that its randomness is known to the attacker, and a more involved variant of the attack (which combines partial decryptions for four well-chosen sets to cancel out all the large terms) still recovers the secret key.

**A simple fix: pseudorandom masks.** Strong security can actually be achieved at essentially no cost, by masking partial decryptions with pseudorandom functions (PRFs), a technique inspired by the lattice-based threshold signature scheme Threshold Raccoon [dPKM+24]. *KeyGen* additionally samples a PRF key $k_{i,j}$ for every ordered pair of parties $(i, j)$, which is given to both parties $i$ and $j$. To partially decrypt a ciphertext $\mathsf{ct}$ for a set $S$, party $i$ computes:

$$
r_i^{S,\mathsf{ct}} = \sum_{j \in S} \left( F_{k_{i,j}}(S, \mathsf{ct}) - F_{k_{j,i}}(S, \mathsf{ct}) \right) \quad \text{and} \quad p_i^S = \lambda_i^S a s_i + e_i + r_i^{S,\mathsf{ct}} .
$$

Each PRF value $F_{k_{i,j}}(S, \mathsf{ct})$ appears with a plus sign in the mask of party $i$ and with a minus sign in the mask of party $j$, so that $\sum_{i \in S} r_i^{S,\mathsf{ct}} = 0$: the masks vanish when the $t$ partial decryptions for $S$ are added up, and *FinDec* is unchanged.

<div class="row mt-3">
    <div class="col-sm-12 mt-3 mt-md-0 mx-auto d-block">
        {% include figure.liquid loading="eager" path="assets/img/blog/2611_Alain/2.png" class="img-fluid rounded z-depth-1" zoomable=true %}
    </div>
</div>
<div class="caption">
    Figure 2: Pairwise PRF masks for $S = \lbrace 2, 3, 4 \rbrace$: the masks cancel out in the final decryption, but hide each partial decryption.
</div>

Now, consider an adversary that corrupts $t-1$ parties and obtains the partial decryption $p_i^S$ of an honest party $i$ (and, for simplicity, no other partial decryption of $\mathsf{ct}$). If all the other parties of $S$ are corrupted, the adversary can compute the mask of party $i$ by itself, but it can then decrypt anyway, and the classical flooding argument applies. Otherwise, $S$ contains another honest party $\ell$, and $p_i^S$ contains the term $F_{k_{i,\ell}}(S, \mathsf{ct}) - F_{k_{\ell,i}}(S, \mathsf{ct})$, computed with two keys unknown to the adversary: $p_i^S$ then looks uniformly random. Extending this argument, we prove that the scheme is secure in the strong model, assuming that the PRF is secure and that the FHE scheme is IND-CPA secure. In particular, partial decryptions for different sets are independent, so that churn is no longer an issue.

The overhead is minor: each party stores $2(n-1)$ additional PRF keys (e.g., AES keys), and performs about $2t$ PRF evaluations per partial decryption. The construction also readily extends to context-dependent decryption [BBN+25], by adding a decryption context to the PRF inputs, and it can be used to require more than $t$ decryptors for some ciphertexts, e.g., more sensitive ones. A related PRF-masking technique appears in [OT25], in a server-aided setting similar to the one of our previous post. Note however that our masks require knowing $S$, so that they do not extend to the asynchronous setting.

## The asynchronous setting

In the classical asynchronous setting, parties compute their partial decryptions without knowing who else participates, and any $t$ partial decryptions must allow decryption. This is more flexible, as parties do not need to agree on $S$ beforehand, but the Lagrange coefficients are back in the decryption error. In [KLL+26], we revisit Shamir-based asynchronous ThFHE with two goals: supporting standard FHE schemes, and making the modulus as small as possible.

**A generic construction.** Our first construction leaves the encryption and evaluation algorithms of the underlying FHE scheme unchanged. Party $i$ outputs $p_i = C_{dec} \cdot a s_i + C_{sim} \cdot e_i$, where $C_{dec}$ and $C_{sim}$ are public scaling factors (ring elements) and $e_i$ is a flooding error, and *FinDec* computes:

$$
C_{dec} \cdot b + \sum_{i \in S} \lambda_i^S p_i = C_{dec} (\Delta m + e) + \sum_{i \in S} (C_{sim} \lambda_i^S) e_i \bmod q ,
$$

from which the plaintext is recovered by rounding and removing the factor $C_{dec}$. Prior Shamir-based constructions [BGG+18, BFM+25] require the FHE scheme to be *special*, i.e., every ciphertext must satisfy $as+b = m + C e$ for some fixed public $C$. This can be enforced at encryption time, but it is not preserved by homomorphic evaluation in general, e.g., by the rescaling operation of CKKS. Here, $C_{dec}$ multiplies the whole phase $as+b$, so that no special structure of the error is needed: the construction applies to plain BFV, BGV and CKKS.

**What drives the modulus.** The two scaling factors play distinct roles, and each one is governed by a norm of Lagrange coefficients. For correctness, $C_{sim}$ must clear the denominators of the Lagrange coefficients, and the decryption error grows with $B_2 = \max_{i,S} \Vert (C_{sim} \lambda_i^S) \bmod q \Vert_1$. For security, a simulator must produce partial decryptions of honest parties without knowing their shares. To do so, it uses the plaintext and the $t-1$ corrupted shares: by Lagrange interpolation, the share of an honest party $i$ can be written as $s_i = \lambda_0 s + \sum_{k \in S_{cor}} \lambda_k s_k$, where $S_{cor}$ is the set of corrupted parties and $\lambda_0, \lambda_k$ are Lagrange coefficients (now interpolating at $\alpha_i$). This gives:

$$
a s_i = \lambda_0 (\Delta m - b + e) + \sum_{k \in S_{cor}} \lambda_k a s_k ,
$$

in which everything is known to the simulator, except the ciphertext error $e$, which is multiplied by the coefficient $\lambda_0$. The flooding error must hide this term, so its magnitude must be about $2^\lambda N B_{eval} B_3$, where $B_{eval}$ bounds the coefficients of $e$ and $B_3$ bounds the norm of $(C_{dec}/C_{sim}) \lambda_0$. Overall, the modulus must be larger than roughly $t \cdot 2^\lambda \cdot N \cdot B_{eval} \cdot B_2 B_3$: compared to the $n$-out-of-$n$ case, Lagrange interpolation costs about $\log(B_2 B_3)$ extra bits, a quantity which only depends on the choice of interpolation points.

**Choosing interpolation points.** For the integer points $\alpha_i = i$, one can take $C_{dec} = (n!)^2$ and $C_{sim} = n!$, and we obtain explicit bounds which improve prior analyses, but the overhead remains of thousands of bits. Our main technical contribution is the analysis of the *monomial* interpolation points $0, 1, X, X^2, \dots, X^{n-1}$ (for $n \le 2N$), also used in [BFM+25, CLW25] following [AL21]. Differences between such points are, up to units, of the form $X^k - 1$, and in the power-of-two cyclotomic ring, $2$ is, up to a unit, a power of $1 - X$: as a result, $C_{dec} = C_{sim} = 2^{\lceil \log t \rceil}$ suffices to clear all the denominators. To bound the Lagrange coefficients, we use the canonical embedding, under which $X^k - 1$ is mapped to complex numbers of modulus $2 \lvert \sin(\pi r k / 2N) \rvert$, for odd $r$. Bounding $B_2$ and $B_3$ then boils down to bounding products of sines and cosines over worst-case configurations of points, which leads to the following *trigonometric bound*:

$$
B_2 B_3 \le 2^{\lceil \log t \rceil} \cdot N \cdot \frac{1}{\sin^2\left(\frac{\pi \lfloor t/2 \rfloor}{2N}\right)} \cdot \prod_{k=1}^{\lfloor t/2 \rfloor - 1} \cot^2\left(\frac{\pi k}{2N}\right) .
$$

Our experiments indicate that this bound is close to tight. It can be further improved by spacing the interpolation points so that they belong to a smaller cyclotomic subring, and by adding *virtual parties*, i.e., public interpolation points whose shares are known to everyone and included in every reconstruction. Virtual parties increase the effective threshold without changing the threshold among real parties, nor the communication. This helps because the bound is not monotonic in the threshold: it is maximal around the middle of the range, and decreases afterwards.

**Results.** The table below gives the modulus overhead $\log(B_2 B_3)$, in bits, for $n = 512$ parties and various thresholds (for the integer points used in [BGG+18], we report our own, improved, bound).

<!--
| Bound | $t = 12$ | $t = 128$ | $t = 256$ | $t = 384$ | $t = 500$ |
|:--|--:|--:|--:|--:|--:|
| [BGG+18] (integer points) | 7918 | 8696 | 9016 | 8951 | 8403 |
| [BFM+25] | 412 | 528 | 656 | 784 | 900 |
| [CLW25] | 189 | 1938 | 3862 | 5784 | 7524 |
| This work (monomial points) | 81 | 361 | 438 | 363 | 86 |
-->

<div style="overflow-x: auto; margin-bottom: 1.0em;">
<table style="border-collapse: collapse; border: 1px solid; min-width: 100%;">
  <thead>
    <tr style="border-bottom: 2px solid ">
      <th style="border: 1px solid; padding: 6px 12px;">Bound</th>
      <th style="border: 1px solid; padding: 6px 12px; text-align: center;">$t = 12$</th>
      <th style="border: 1px solid; padding: 6px 12px; text-align: center;">$t = 128$</th>
      <th style="border: 1px solid; padding: 6px 12px; text-align: center;">$t = 256$</th>
      <th style="border: 1px solid; padding: 6px 12px; text-align: center;">$t = 384$</th>
      <th style="border: 1px solid; padding: 6px 12px; text-align: center;">$t = 500$</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td style="border: 1px solid; padding: 6px 12px;">[BGG+18] (integer points)</td>
      <td style="border: 1px solid; padding: 6px 12px; text-align: right;">7918</td>
      <td style="border: 1px solid; padding: 6px 12px; text-align: right;">8696</td>
      <td style="border: 1px solid; padding: 6px 12px; text-align: right;">9016</td>
      <td style="border: 1px solid; padding: 6px 12px; text-align: right;">8951</td>
      <td style="border: 1px solid; padding: 6px 12px; text-align: right;">8403</td>
    </tr>
    <tr>
      <td style="border: 1px solid; padding: 6px 12px;">[BFM+25]</td>
      <td style="border: 1px solid; padding: 6px 12px; text-align: right;">412</td>
      <td style="border: 1px solid; padding: 6px 12px; text-align: right;">528</td>
      <td style="border: 1px solid; padding: 6px 12px; text-align: right;">656</td>
      <td style="border: 1px solid; padding: 6px 12px; text-align: right;">784</td>
      <td style="border: 1px solid; padding: 6px 12px; text-align: right;">900</td>
    </tr>
    <tr>
      <td style="border: 1px solid; padding: 6px 12px;">[CLW25]</td>
      <td style="border: 1px solid; padding: 6px 12px; text-align: right;">189</td>
      <td style="border: 1px solid; padding: 6px 12px; text-align: right;">1938</td>
      <td style="border: 1px solid; padding: 6px 12px; text-align: right;">3862</td>
      <td style="border: 1px solid; padding: 6px 12px; text-align: right;">5784</td>
      <td style="border: 1px solid; padding: 6px 12px; text-align: right;">7524</td>
    </tr>
    <tr>
      <td style="border: 1px solid; padding: 6px 12px;">This work (monomial points)</td>
      <td style="border: 1px solid; padding: 6px 12px; text-align: right;">81</td>
      <td style="border: 1px solid; padding: 6px 12px; text-align: right;">361</td>
      <td style="border: 1px solid; padding: 6px 12px; text-align: right;">438</td>
      <td style="border: 1px solid; padding: 6px 12px; text-align: right;">363</td>
      <td style="border: 1px solid; padding: 6px 12px; text-align: right;">86</td>
    </tr>
  </tbody>
</table>
</div>

Compared to the best prior bound [BFM+25], the overhead is reduced by about 33% for $t = n/2$, and by up to 90% for $t$ close to $n$. Unlike the bounds of [BFM+25] and [CLW25], which increase with $t$, ours are almost symmetric in $t$ and $n-t$. These constructions are proven secure under the standard simulation-based notion of [BGG+18], against a static adversary corrupting $t-1$ parties. 

## Strong simulation security

The standard simulation-based notion [BGG+18] gives the plaintext to the simulator before the first honest partial decryption of a ciphertext: it implicitly assumes that any ciphertext partially decrypted by an honest party is meant to be fully decrypted. The *strong* simulation notion of [EY24] removes this assumption: the simulator only receives the plaintext when the $t$-th partial decryption of the ciphertext is released (counting corrupted parties). This is not a mere subtlety. Take $t = n = 2$ and $s = s_1 + s_2$: without corrupting anyone, an adversary can obtain $p_1 \approx a s_1$ from party $1$ for a target ciphertext $\mathsf{ct} = (a,b)$, and $p_2 \approx a' s_2$ and $p_3 \approx (a + a') s_2$ from party $2$ for another ciphertext $\mathsf{ct}' = (a', b')$ and for $\mathsf{ct} + \mathsf{ct}'$. Then, $b + p_1 + p_3 - p_2 \approx b + as$ reveals the plaintext of $\mathsf{ct}$, although no ciphertext has received $t$ partial decryptions. Our first construction is vulnerable to this attack.

The only prior construction achieving strong simulation security [EY24] relies on reconstruction coefficients in $\lbrace 0, 1 \rbrace$ (hence on huge shares), on the special FHE scheme of [BGG+18], and on almost key-homomorphic PRFs, so that it does not apply to CKKS. Our second construction gives each party an additional Shamir share $z_i$ of $0$, and masks partial decryptions with an RLWE sample:

$$
p_i = C_{dec} \cdot \left( a s_i + H(\mathsf{ct}) \cdot z_i + e_i' \right) + C_{sim} \cdot e_i \bmod q ,
$$

where $H$ is a hash function onto $R_q$, modeled as a random oracle, and $e_i'$ is a small error. The masks cancel out upon reconstruction, since $\sum_{i \in S} \lambda_i^S z_i = 0$. Before that, at most $t-1$ parties (corrupted ones included) are involved, so that the zero-shares of the honest ones are jointly uniform from the adversary's point of view, and the masks are pseudorandom under the RLWE assumption, with $H(\mathsf{ct})$ playing the role of the public uniform element. This is the first Shamir-based construction with strong simulation security, and it applies to BFV, BGV and CKKS.

Each party only stores two ring elements, but the modulus is larger, as the simulator must now absorb interpolation errors at every interpolation point, not only at $0$: for $N = 2^{14}$ and 128-bit security, our bounds give a sufficient modulus of 219 bits for $(n, t) = (16, 8)$, and of 1589 bits for $(n, t) = (1024, 512)$. In comparison, [EY24] has a smaller modulus, but requires about 79 GB of storage per party for $(n, t) = (16, 8)$, against 897 KB for our construction, and about $4.2 \times 10^9$ GB for $(n, t) = (1024, 512)$, against 6.5 MB.

Strong simulation security is the asynchronous counterpart of the strong notion we introduced for synchronized decryptors, and comparing both settings is instructive: with synchronized decryptors, PRF masks provide strong security at essentially no cost, whereas without synchronization, strong security comes at the price of a larger modulus. The techniques do not transfer either: our PRF masks require knowing the set of decryptors, while adapting the key-homomorphic masks of [EY24] to the synchronous setting leads to an insecure scheme.


## Distributed key generation

So far, we assumed that *KeyGen* is run by a trusted dealer. For CKKS, the standard way to avoid such a dealer is the distributed key generation (DKG) protocol of [MTBH21]: each party samples its own small secret $s_i$ and publishes $a s_i + e_i$ for a common random $a$, so that the sum of these values is a public key for the joint secret key $s = \sum_i s_i$ (evaluation keys require one more round, and $t$-out-of-$n$ sharing is obtained by re-sharing the $s_i$'s [MBH23]). Unfortunately, $s$ is then dense and its coefficients grow with $n$, which is bad news for bootstrapping. Indeed, efficient CKKS bootstrapping relies on *sparse secret encapsulation* [BTH22]: computations use a ternary key of moderate Hamming weight (e.g., 192), while bootstrapping temporarily switches to a very sparse ternary key (e.g., of Hamming weight 32), which saves depth and makes bootstrapping failures negligible, a security requirement in the threshold setting [CCP+24]. With a dense key, the throughput is estimated to drop by at least 71% for $n = 32$ parties, so that threshold-CKKS implementations rather replace bootstrapping by an interactive protocol.

In [MHP+25], we use a temporary ThFHE scheme to homomorphically run the key generation algorithm of the target scheme, in the spirit of the universal thresholdizer of [BGG+18]. Parties first run [MTBH21] to obtain temporary keys, with a dense secret key. They then contribute encrypted random bits, which are summed and bootstrapped, and used to homomorphically sample a sparse and a less-sparse ternary secret key. These encrypted keys are decrypted "into shares" (each party masks its partial decryption with a large random term, which directly yields an additive sharing of the key), and parties use their shares to generate the final public and evaluation keys. The main challenge is to homomorphically sample a uniform ternary vector of dimension $N$ (e.g., $N = 2^{16}$) with Hamming weight *exactly* $h$ (e.g., $h = 32$). Our sampler combines integer indicator functions evaluated with Chebyshev polynomials, a new sampler of one-hot vectors (a matrix-vector product followed by an indicator function, with lower depth and fewer rotations than prior approaches [BEHG20]), and a rejection step which adds up random one-hot vectors one by one, and keeps the first partial sum with exactly $h$ non-zero entries ($45$ one-hot vectors suffice for $h = 32$). The whole process requires only two bootstraps.

<div class="row mt-3">
    <div class="col-sm-12 mt-3 mt-md-0 mx-auto d-block">
        {% include figure.liquid loading="eager" path="assets/img/blog/2611_Alain/3.png" class="img-fluid rounded z-depth-1" zoomable=true %}
    </div>
</div>
<div class="caption">
    Figure 3: Distributed key generation for threshold-CKKS with sparse secret keys.
</div>

The main protocol has 4 rounds (variants with 2 and 3 rounds are also given), and it is secure against semi-honest adversaries corrupting all parties but one. It outputs an $n$-out-of-$n$ sharing of the key, which can be turned into a $t$-out-of-$n$ Shamir sharing by re-sharing, without any additional round. Its bottleneck, the homomorphic key sampling, is a public computation which takes less than 2 seconds on an RTX 4090 GPU for up to 1024 parties, and the communication per party is within a small factor of the size of the final key material. With the resulting keys, homomorphic computations, including bootstrapping, are as fast as in single-key CKKS, at the cost of about 1.28 bits of precision. The same techniques also allow a lightweight client to delegate the generation of its (large) evaluation keys to non-colluding servers.

## References

[AL21] M. R. Albrecht and R. W. F. Lai, "Subtractive Sets over Cyclotomic Rings: Limits of Schnorr-like Arguments over Lattices." CRYPTO 2021

[BBN+25] D. Boneh, B. Bünz, K. Nayak, L. Rotem, and V. Shoup, "Context-Dependent Threshold Decryption and its Applications." ASIACRYPT 2025

[BEHG20] D. Boneh, S. Eskandarian, L. Hanzlik, and N. Greco, "Single Secret Leader Election." ACM AFT 2020

[BFM+25] Z. Brakerski, O. Friedman, A. Marmor, D. Mutzari, Y. Spiizer, and N. Trieu, "Threshold FHE with Efficient Asynchronous Decryption." ePrint 2025/712

[BGG+18] D. Boneh, R. Gennaro, S. Goldfeder, A. Jain, S. Kim, P. M. R. Rasmussen, and A. Sahai, "Threshold Cryptosystems from Threshold Fully Homomorphic Encryption." CRYPTO 2018

[BTH22] J.-P. Bossuat, J. R. Troncoso-Pastoriza, and J.-P. Hubaux, "Bootstrapping for Approximate Homomorphic Encryption with Negligible Failure-Probability by Using Sparse-Secret Encapsulation." ACNS 2022

[CCP+24] J. H. Cheon, H. Choe, A. Passelègue, D. Stehlé, and E. Suvanto, "Attacks Against the IND-CPA-D Security of Exact FHE Schemes." ACM CCS 2024

[CLW25] V. Cini, R. W. F. Lai, and I. K. Y. Woo, "Pilvi: Lattice Threshold PKE with Small Decryption Shares and Improved Security." ASIACRYPT 2025

[CPS26] F. Colin de Verdière, A. Passelègue, and D. Stehlé, "On Threshold Fully Homomorphic Encryption with Synchronized Decryptors." ACM CCS 2026

[dPKM+24] R. del Pino, S. Katsumata, M. Maller, F. Mouhartem, T. Prest, and M.-J. Saarinen, "Threshold Raccoon: Practical Threshold Signatures from Standard Lattice Assumptions." EUROCRYPT 2024

[EY24] E. Ebrahimi and A. Yadav, "Strongly Secure Universal Thresholdizer." ASIACRYPT 2024

[GKS24] K. D. Gur, J. Katz, and T. Silde, "Two-Round Threshold Lattice-Based Signatures from Threshold Homomorphic Encryption." PQCrypto 2024

[KLL+26] W. Kim, C. Lee, J. Lee, A. Passelègue, and D. Stehlé, "Asynchronous Shamir-Based Threshold FHE: Smaller Moduli and Strong Simulation Security." IACR ePrint 2026/973 (extended version of a CRYPTO 2026 paper)

[MBH23] C. Mouchet, E. Bertrand, and J.-P. Hubaux, "An Efficient Threshold Access-Structure for RLWE-Based Multiparty Homomorphic Encryption." Journal of Cryptology, 36(2), 2023

[MCPT24] C. Mouchet, S. Chatel, A. Pyrgelis, and C. Troncoso, "Helium: Scalable MPC among Lightweight Participants and under Churn." ACM CCS 2024

[MHP+25] S. Min, G. Hanrot, J. H. Park, A. Passelègue, and D. Stehlé, "Distributed Key Generation for Efficient Threshold-CKKS." ACM CCS 2026

[MTBH21] C. Mouchet, J. R. Troncoso-Pastoriza, J.-P. Bossuat, and J.-P. Hubaux, "Multiparty Homomorphic Encryption from Ring-Learning-with-Errors." PETS 2021

[OT25] H. Okada and T. Takagi, "Low Communication Threshold FHE from Standard (Module-)LWE." ASIACRYPT 2025
