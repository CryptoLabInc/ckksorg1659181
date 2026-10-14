---
layout: post
title: >
  Reevaluating the Security of Sparse Secret Ring Learning with Errors
date: 2026-10-13 00:00:00-0000
description: >
  TL;DR: Sparse secret keys reduce noise growth and make bootstrapping cheaper in CKKS, and their security is usually estimated by treating RLWE as if it were plain LWE. We show that this overestimates security: an attacker can rotate a sparse RLWE secret, which makes hybrid guessing attacks much more effective and costs up to 14 bits of security. Under this attack, the default sparse parameters in HEaaN and Lattigo, and two benchmark submissions, fall below 128-bit security. In this post, we explain how hybrid attacks work, why the ring structure helps the attacker, and what this means for parameter selection.
author: Tabitha Ogilvie 
tags: 
categories: 
related_posts: false
toc:
  sidebar: right
giscus_comments: true
---

* Written by [Tabitha Ogilvie](https://scholar.google.com/citations?user=XEVjf0gAAAAJ&hl) (King's College London)
* Based on [Careful with the Ring! Concrete Hardness Gaps between LWE and MLWE](https://doi.org/10.1007/978-3-032-35377-1_15) (CRYPTO 2026). You can find [full version (a) here](https://eprint.iacr.org/2026/279) and [full version (b) here](https://eprint.iacr.org/2026/366).

*TL;DR: Sparse secret keys reduce noise growth and make bootstrapping cheaper in CKKS, and their security is usually estimated by treating RLWE as if it were plain LWE. We show that this overestimates security: an attacker can rotate a sparse RLWE secret, which makes hybrid guessing attacks much more effective and costs up to 14 bits of security. Under this attack, the default sparse parameters in HEaaN and Lattigo, and two benchmark submissions, fall below 128-bit security. In this post, we explain how hybrid attacks work, why the ring structure helps the attacker, and what this means for parameter selection.*

## Introduction

Sparse secret keys, in which only a small set of coefficients are non-zero, are now common in CKKS. They help in two ways. First, the noise added by operations such as rescaling and key switching grows with the size of the secret, so a sparser secret means less noise and better precision. Second, they make bootstrapping cheaper: the sparser the secret, the fewer levels bootstrapping needs to consume. Many implementations therefore use a sparse main key (with $h \approx 192$) for computation, and use sparse-secret encapsulation \[[5](https://eprint.iacr.org/2022/024)\] to switch to an extremely sparse key (with $h \approx 32$) for part of bootstrapping. As a result, sparse secrets appear throughout recent CKKS libraries, applications and research papers.

A sparse key has much less entropy than a dense one, so it is also easier to attack. In particular, sparse secrets enable *hybrid attacks*, which guess part of the secret and use lattice reduction to recover the rest \[[1](https://eprint.iacr.org/2017/047), [2](https://eprint.iacr.org/2019/1122), [8](https://eprint.iacr.org/2019/1019)\]. To select parameters, practitioners estimate the cost of these attacks with tools such as the [Lattice Estimator](https://github.com/malb/lattice-estimator). These tools estimate the security of LWE, and the standard practice is to treat an RLWE instance as if it were an LWE instance with the same parameters. This is based on the widely held assumption that, in the power-of-two cyclotomic rings used in CKKS, the ring structure does not help the attacker.

In our recent work, we show that this assumption does not hold for sparse secrets. In a power-of-two cyclotomic ring, multiplying by $X$ rotates the coefficients of the secret. An attacker can use these rotations to try their best guess against many different parts of the secret, all for the cost of a single lattice reduction. The resulting attack reduces the security of sparse RLWE by up to 14 bits compared to the corresponding LWE estimate.

In this post, we give an overview of how the security of LWE and RLWE is estimated, explain hybrid attacks and how the ring structure makes them stronger, and estimate the security of sparse parameter sets used in practice, including library defaults and submissions to the FHE benchmarking suite. We find that most of them fall below 128-bit security.

## LWE and RLWE

In the [Learning with Errors](https://arxiv.org/abs/2401.03703) (LWE) search problem, an adversary is given a vector-matrix pair $(\mathbf{b}, \mathbf{A}) \in \mathbb{Z}_q^{m} \times \mathbb{Z}_q^{m \times n}$, with $$\mathbf{b} = \mathbf{A}\mathbf{s} + \mathbf{e} \mod q,$$ for some *secret* $\mathbf{s} \in \mathbb{Z}_q^n$ and *error* $\mathbf{e} \in \mathbb{Z}_q^m$, and $\mathbf{A}$ uniform. The adversary's goal is to recover the secret $\mathbf{s}$: to make sure our cryptographic applications are secure, we must ensure this is difficult to do.

For efficient Homomorphic Encryption, we often need ciphertexts with more algebraic structure than we get from LWE. This is possible if we use the [Ring Learning with Errors](https://eprint.iacr.org/2012/230) (RLWE) search problem instead of LWE — here, we swap the *integers* modulo $q$ for a *ring* modulo $q$. In particular, we set some power-of-two cyclotomic ring $\mathcal{R} = \mathbb{Z}_q[X]/(X^n + 1)$, and give the adversary a pair of ring elements $(b(X), a(X))\in \mathcal{R}^2$, where $$b(X) = a(X) s(X) + e(X)  \mod q,$$ for some secret ring polynomial $s(X) \in \mathcal{R}$ and error polynomial $e(X) \in \mathcal{R}$. Once again, the adversary's goal is to determine the secret $s(X)$.

The LWE and RLWE problems have many parameters that practitioners can tune for their application. For Homomorphic Encryption, the most important settings are:

* **The width of the error $e$**: the larger the error, the less precision our HE scheme can achieve.
* **The modulus $q$**: the larger the modulus, the more homomorphic operations we can perform before bootstrapping.
* **The secret key dimension or polynomial degree $n$**: the larger the ring, the less efficient our homomorphic operations.

In recent applications, practitioners have found an additional way to increase efficiency — making the secret key extremely *sparse*. This introduces an additional setting:

* **the Hamming weight of the secret key, $h$**: the lower $h$, the less noise our homomorphic operations add, and the more efficient the bootstrapping procedure will be.

## What Makes These *Lattice Problems*?

Suppose we are the adversary, and we want to recover the secret vector or polynomial. One of the strongest attacks we can use is to embed the information we have into a lattice, and use lattice reduction to recover a solution. We'll only look at the case the secret has small coefficients, which is standard in Homomorphic Encryption.

### LWE

Lets start by writing our LWE equation over the integers — $$\mathbf{b} = \mathbf{A}\mathbf{s} + \mathbf{e} + q\mathbf{w}$$ for some integer vector $\mathbf{w} \in \mathbb{Z}^m$. Now we can write the known vector $\begin{pmatrix}\mathbf{b} \\ \mathbf{0}\end{pmatrix}$ as follows.

$$
\underbrace{
\begin{pmatrix}
\mathbf{b} \\
\mathbf{0}
\end{pmatrix}
}_{\color{#2f80ed}{\text{known target}}}
=
\underbrace{
\begin{pmatrix}
q\mathbf{I}_m & \mathbf{A} \\
\mathbf{0} & \mathbf{I}_n
\end{pmatrix}
}_{\color{#2f80ed}{\substack{\text{known}\\ \text{lattice basis}}}}
\underbrace{
\begin{pmatrix}
\mathbf{w} \\
\mathbf{s}
\end{pmatrix}
}_{\color{#e07b00}{\substack{\text{unknown}\\\text{coefficients}}}}
+
\underbrace{
\begin{pmatrix}
\mathbf{e} \\
-\mathbf{s}
\end{pmatrix}
}_{\color{#e07b00}{\substack{\text{unknown short}\\\text{displacement}}}}
$$
This means we have a target which is unusually close to a lattice for which we have a basis! If we could somehow *round* our target to the lattice, we'd recover the unknown short displacement, from which we'd discover the secret key. This is exactly the Bounded Distance Decoding lattice problem: we know the lattice and a target unusually close to a lattice point, and we want to find that point.

### RLWE

We can also turn our ring equation into a lattice problem. First, we turn the ring polynomial $\mathbf{a}$ into a matrix $\mathbf{A}\in\mathbb{Z}_q^{n \times n}$ corresponding to ring multiplication by $\mathbf{A}$. In $\mathcal{R}$, this matrix is *negacyclic*:
$$a(X)=a_0 + a_1X + \cdots + a_{n-1}X^{n-1}\quad\mapsto\quad\mathbf{A}=
\begin{pmatrix}
a_0       & -a_{n-1} & -a_{n-2} & \cdots & -a_1 \\
a_1       & a_0      & -a_{n-1} & \cdots & -a_2 \\
a_2       & a_1      & a_0      & \ddots & \vdots \\
\vdots    & \vdots   & \ddots   & \ddots & -a_{n-1} \\
a_{n-1}   & a_{n-2}  & \cdots   & a_1    & a_0
\end{pmatrix}.
$$
Writing $\mathbf{b}, \mathbf{s}, \mathbf{e}$ for the coefficient vectors of $b(X),s(X),e(X)$ gives exactly the same BDD instance as above, except that $\mathbf{A}$ is now negacyclic rather than uniform.

This basis has a lot more structure than in the plain LWE case, where the $\mathbf{A}$ matrix has uniform entries. However, (at the time of writing), it is not known how to exploit this structure in lattice only attacks. Later in this article, we'll see that it is possible to leverage this structure in *hybrid* attacks.

### Tradeoffs under Plain Lattice Reduction

Before we discuss hybrid attacks and our results, we give some asymptotics for how the main LWE parameters interact under a **plain lattice reduction attack**. These are only meant as rough guides: for concrete security, parameters should always be submitted to an estimator.

**Ring degree $n$ vs modulus $q$.** If we fix the security level $\lambda$ and the secret and error distributions, then for large $q$,

$$
n=\Theta(\log q).
$$

> Under a plain lattice attack, doubling $\log q$ requires doubling $n$ to maintain the same security level.

**Error size $\sigma_e$ vs modulus $q$.** If instead we fix $n$, $\lambda$, and the secret distribution, then approximately

$$
\frac{q}{\sigma_e}=\text{constant}.
$$

> Under a plain lattice attack, adding one bit to $\log q$ requires doubling the error width $\sigma_e$.

These approximations are useful for understanding ordinary lattice reduction, but they should **not** be read as general rules for when the secret key is sparse. In fact,sparse secrets enable hybrid attacks which guess part of the secret and run lattice reduction only on what remains. The effective lattice dimension can therefore be substantially smaller than $n$, and these simple tradeoffs no longer describe the best known attack. We turn to those attacks next.

<details>
<summary><strong>Where do the two scaling laws come from?</strong></summary>

From \[[3](https://eprint.iacr.org/2024/1895), Equation (8)\], if the secret and error distributions have standard deviations $\sigma_s$ and $\sigma_e$, respectively, then achieving a security level of $\lambda$ bits requires approximately

$$
n\approx
\frac{
\lambda
\left(
\frac{1}{2}\log_2\left(\frac{\lambda}{0.292}\right)
+
\log_2\left(\frac{q}{2\pi e\,\sigma_e}\right)
\right)^2
}{
0.584\,
\log_2\left(\frac{q\sigma_s}{\sigma_e}\right)
\log_2\left(\frac{\lambda}{0.584\pi e}\right)
},
$$

where $e$ (confusingly) is Euler's number.

For fixed $\lambda$, $\sigma_s$, and $\sigma_e$, the numerator of this expression grows as $(\log q)^2$, while the $q$-dependent term in the denominator grows as $\log q$. Hence

$$
n=\Theta(\log q).
$$

For fixed $n$, $\lambda$, and $\sigma_s$, the occurrences of $q$ and $\sigma_e$ are through their ratio $q/\sigma_e$, giving approximately

$$
\frac{q}{\sigma_e}=\text{constant}.
$$

</details>

## Hybrid Attacks

When the secret is sparse, a new class of attacks start to dominate — hybrid guessing attacks. Because the secret key has lower entropy, it becomes feasible for the attacker to guess a large chunk of the secret key coefficients, and use a lattice attack to recover the rest.

In particular, split

$$
\mathbf{s}
=
(\mathbf{s}_1,\mathbf{s}_2),
\qquad
\mathbf{A}
=
(\mathbf{A}_1 \mid \mathbf{A}_2).
$$
so that

$$
\mathbf{b}
=
\mathbf{A}_1\mathbf{s}_1
+
\mathbf{A}_2\mathbf{s}_2
+
\mathbf{e}
\pmod q.
$$
For a guess of $\mathbf{s}_1$, we obtain the target

$$
\mathbf{b}
-
\mathbf{A}_1\mathbf{s}_1
=
\mathbf{A}_2\mathbf{s}_2
+
\mathbf{e}
\pmod q,
$$
which is a lower dimensional BDD instance.

The important observation is that the lattice basis depends only on $\mathbf{A}_2$, not on the guessed value of $\mathbf{s}_1$. We can therefore perform the expensive lattice reduction needed for the BDD instance once, and reuse the reduced basis across many guesses.

The best attack will involve carefully balancing the guessing and lattice parts of the attack. The sparser the secret, the more coordinates we can afford to guess, and the less time we will spend on the initial basis processing. We will see in the next part that the RLWE ring structure allows for a better tradeoff between guessing and lattice processing, resulting in a better attack, and, in turn, lower security levels.

## Exploiting the Ring Structure

In the previous section, we saw that the expensive lattice reduction depends only on $\mathbf{A}_2$, not on the particular value guessed for $\mathbf{s}_1$. For plain LWE, we exploit this by making many different guesses for $\mathbf{s}_1$ against the same reduced basis.

For RLWE, the ring structure gives us another way to generate guesses against this basis. Recall that in $\mathcal{R}$, multiplication by $X$ is just a negacyclic rotation of the coefficient vector:

$$
(s_0,s_1,\ldots,s_{n-1})
\xmapsto{\times X}
(-s_{n-1},s_0,\ldots,s_{n-2}).
$$

In particular, multiplication by $X^j$ preserves both the sparsity of the secret and the size of the error. Starting from

$$
\mathbf{b}=\mathbf{A}\mathbf{s}+\mathbf{e}\pmod q,
$$

we can therefore multiply the whole RLWE instance by $X^j$ to obtain

$$
X^j\mathbf{b}
=
\mathbf{A}_1\left(X^j\mathbf{s}\right)_1
+
\mathbf{A}_2\left(X^j\mathbf{s}\right)_2
+
X^j\mathbf{e}
\pmod q.
$$

Here $\left(X^j\mathbf{s}\right)_1$ denotes the coordinates falling in the guessing part after rotation, and $\left(X^j\mathbf{s}\right)_2$ the coordinates left for lattice reduction.

For any fixed rotation $j$, if we guess $\left(X^j\mathbf{s}\right)_1$ correctly, we obtain the Bounded Distance Decoding instance

$$
\underbrace{
\begin{pmatrix}
X^j\mathbf{b}
-
\mathbf{A}_1\left(X^j\mathbf{s}\right)_1
\\
\mathbf{0}
\end{pmatrix}
}_{\color{#2f80ed}{\text{new target}}}
=
\underbrace{
\begin{pmatrix}
q\mathbf{I}_m & \mathbf{A}_2
\\
\mathbf{0} & \mathbf{I}_{n-\zeta}
\end{pmatrix}
}_{\substack{\color{#2f80ed}{\text{same lattice basis}}\\
\textit{for every }j}}
\begin{pmatrix}
X^j\mathbf{w}
\\
\left(X^j\mathbf{s}\right)_2
\end{pmatrix}
+
\begin{pmatrix}
X^j\mathbf{e}
\\
-\left(X^j\mathbf{s}\right)_2
\end{pmatrix}.
$$

The important point is that changing $j$ changes the target, but **not the lattice basis**. We can therefore reuse the same lattice preprocessing for guesses of different segments of the secret: for each attempt, we choose a rotation $j$, guess the corresponding coordinates $\left(X^j\mathbf{s}\right)_1$, and form the appropriate target.

### Guessing with Rotations is *Better*

Although we have shown it's always *possible* to use the ring structure when guessing, its not yet clear it's *better*.

To demonstrate the advantage, we sampled $10{,}000$ random secrets with $n = 2^{14}$, guessing $2^{12}$ of the coefficients, and measured how often a set of guesses contains the secret, with and without rotations.

<div class="row mt-3">
    <div class="col-sm-12 mt-3 mt-md-0 mx-auto d-block">
        {% include figure.liquid loading="eager" path="assets/img/blog/2610_Tabitha/hit_probability.svg" class="img-fluid rounded z-depth-1" zoomable=true %}
    </div>
</div>
<div class="caption">
    Figure 1. The chance that our guesses include the secret, against the number of guesses we make, for $n = 2^{14}$ and $2^{12}$ guessed coefficients. The curve with rotations is measured over 10k random secrets; the plain hybrid curve is exact.
</div>

For $h = 32$, rotations give us an $80\%$ chance of including the secret after only $2^{14}$ guesses (one all-zero guess per rotation). Without rotations, we need around $2^{104}$ guesses to achieve the same probability. For $h = 64$ the gap is even wider.

These advantages do not translate directly into the same gap in bit security between LWE and RLWE, as the optimal guessing dimension will differ between the two. Still, this figure does demonstrate where the gap RLWE vs LWE comes from in our work: ring structure allows for a better guessing strategy, that hits with higher probability in fewer guesses.

<details>
<summary><strong>Why is rotating better?</strong></summary>

Take a very sparse secret: $n = 2^{14}$ coefficients, of which only $h = 32$ are non zero. Suppose we are running a hybrid attack where we guess $2^{12}$ of the coefficients, a quarter of the key.

Our best guess by far is the all zero guess. As we are guessing a quarter of the key, each non zero coefficient lands outside our guessing set with probability $3/4$, so this guess is right with probability about

$$
\left(\tfrac{3}{4}\right)^{32} \approx \frac{1}{10{,}000}.
$$

Most of the time then, this guess fails. What should we guess next?

<strong>Without the ring structure</strong>, we have to make a different guess on the same coordinates. The next best guesses say that exactly one of them is non zero. There are $8{,}192$ such guesses, and each one is right only about once in $7.7$ million tries.

<strong>With the ring structure</strong>, we can rotate the secret and guess "all zero" again. This is a fresh attempt at our best guess, again with a $1$ in $10{,}000$ chance. So the second guess we make with rotations is roughly $770$ times more likely to be right than the next guess we could make without them.

And we can do it once for each of the $n = 16{,}384$ rotations. The chance that at least one of them succeeds is about

$$
1 - \left(1 - \tfrac{1}{10{,}000}\right)^{16{,}384} \approx 80\%.
$$

Here is the same idea on a toy secret:

<div class="row mt-3">
    <div class="col-sm-12 mt-3 mt-md-0 mx-auto d-block">
        {% include figure.liquid loading="eager" path="assets/img/blog/2610_Tabitha/rotations.gif" class="img-fluid rounded z-depth-1" zoomable=true %}
    </div>
</div>
<div class="caption">
    Figure 2. A toy secret with 32 coefficients, 4 of them non-zero, where we guess 8 coefficients at a time. Rotating the secret by $j$ is the same as sliding our guess $j$ places along it.
</div>

</details>

## Impact on Sparse Parameter Sets in Use Today

We now turn to the security of sparse secret parameter sets used in practice. We consider two sources: the default bootstrapping parameters provided by HE libraries, and the CKKS submissions to the [FHE benchmarking suite](https://fhe-benchmarking.github.io/), which requires every submission to use parameters with at least 128 bits of security. We report estimates for our attack in Table 1.

<div style="display: flex; justify-content: center;" markdown="1">


| Library | Use case | $\log n$ | $\log QP$ | $h$ | $\sigma_e$ | $\lambda$ | Estimate (bits) | Source |
|---|---|:---:|:---:|:---:|:---:|:---:|:---:|---|
| HEaaN | Library defaults for `FGb` | 16 | 1555 | 192 | 3.2 | 128 | <strong style="color:#d03b3b">122.3</strong> | [parameters](https://github.com/CryptoLabInc/deb/blob/f0af0000663e20666dd0ea091cf201a1522ae50b/prebuild/DebParamPreset.json#L31-L92) |
| HEaaN2 | Fetch-by-similarity benchmark | 16 | 1721 | 1024 | 3.2 | 128 | <strong style="color:#d03b3b">127.1</strong> | [README](https://github.com/CryptoLabInc/fhe-benchmark-fetch-by-similarity/blob/035ab234e6b9bfb94c93bb4b7fbe05e77588b70a/submission/README.md#L43-L60) |
| HEaaN2 | Fetch-by-similarity benchmark | 14 | 82 | 32 | 3.2 | 128 | <strong style="color:#d03b3b">125.8</strong> | [README](https://github.com/CryptoLabInc/fhe-benchmark-fetch-by-similarity/blob/035ab234e6b9bfb94c93bb4b7fbe05e77588b70a/submission/README.md#L43-L60) |
| OpenFHE | CIFAR-10 benchmark reference | 16 | 1708 | 192 | 3.19 | 128 | <strong style="color:#d03b3b">113.0</strong> | [code](https://github.com/fhe-benchmarking/ml-inference/blob/739378698fc1f668aff7246724b45cff76f04a98/submissions/cifar10/src/client_key_generation.cpp#L33-L48), [README](https://github.com/fhe-benchmarking/ml-inference/blob/739378698fc1f668aff7246724b45cff76f04a98/submissions/cifar10/docs/README.md#L26-L35) |
| Lattigo | Library defaults | 16 | 1546 | 192 | 3.2 | 128 | <strong style="color:#d03b3b">123.1</strong> | [parameters `N16QP1546H192H32`](https://github.com/tuneinsight/lattigo/blob/5dbffbdea05394de2ca3a432ed5318aa832e3f40/circuits/ckks/bootstrapping/default_parameters.go#L26-L43) |
| Lattigo | Library defaults | 16 | 1547 | 192 | 3.2 | 128 | <strong style="color:#d03b3b">123.0</strong> | [parameters `N16QP1547H192H32`](https://github.com/tuneinsight/lattigo/blob/5dbffbdea05394de2ca3a432ed5318aa832e3f40/circuits/ckks/bootstrapping/default_parameters.go#L44-L66) |
| Lattigo | Library defaults | 16 | 1553 | 192 | 3.2 | 128 | <strong style="color:#d03b3b">122.6</strong> | [parameters `N16QP1553H192H32`](https://github.com/tuneinsight/lattigo/blob/5dbffbdea05394de2ca3a432ed5318aa832e3f40/circuits/ckks/bootstrapping/default_parameters.go#L67-L88) |
| Lattigo | Library defaults | 15 | 768 | 192 | 3.2 | 128 | <strong style="color:#d03b3b">123.3</strong> | [parameters `N15QP768H192H32`](https://github.com/tuneinsight/lattigo/blob/5dbffbdea05394de2ca3a432ed5318aa832e3f40/circuits/ckks/bootstrapping/default_parameters.go#L89-L110) |
| Lattigo | Library defaults | 16 | 121 | 32 | 3.2 | 128 | 161.5 | [documentation](https://github.com/tuneinsight/lattigo/blob/5dbffbdea05394de2ca3a432ed5318aa832e3f40/circuits/ckks/bootstrapping/parameters_literal.go#L63), [default weight](https://github.com/tuneinsight/lattigo/blob/5dbffbdea05394de2ca3a432ed5318aa832e3f40/circuits/ckks/bootstrapping/parameters_literal.go#L165-L166) |

</div>

<div class="caption">
    Table 1. Estimated security of sparse secret CKKS parameter sets under our attack. $\lambda$ denotes the claimed security level. Estimates below the claimed security level are shown in red. For the HEaaN and HEaaN2 parameter sets, $\sigma_e$ is not stated in the source and we assume $3.2$.
</div>

Our attack reduces all but one of these parameter sets below their target security level. The default sparse parameters in HEaaN and Lattigo, which share very similar choices ($n = 2^{16}$, $h = 192$, and $\log_2 QP \approx 1550$), are estimated at between 122 and 124 bits. The HEaaN2 benchmark parameters were selected to achieve just over 128 bits using the standard [Lattice Estimator](https://github.com/malb/lattice-estimator); under our attack, both the main key and the bootstrapping key fall below this level.

Table 1 is only a small subset of the sparse parameters for which our attack has an impact. In [our paper](https://doi.org/10.1007/978-3-032-35377-1_15), we give estimates for a wider range of parameter sets, including the sparse parameters proposed in recent publications at major cryptography venues.

## Conclusion and Takeaways

Sparse secrets reduce noise growth and make bootstrapping cheaper, but they also allow adversaries to use different kinds of attack, and in RLWE the ring structure gives them even more of an advantage. For practitioners, we suggest the following.

* **Prefer dense secrets where you can.** Our attack is most applicable to sparse secrets. Uniform ternary secrets are unaffected.
* **Estimate RLWE parameters as RLWE.** Estimating a sparse RLWE instance as if it were plain LWE can overestimate its security by up to 15 bits. If you use sparse secret RLWE parameters, estimate their security with an attack that exploits the ring structure. Our estimator is [available on GitHub](https://github.com/TabOg/mlwe-hybrids/PrimalHybrid). Integrating our attack in the main [Lattice Estimator](https://github.com/malb/lattice-estimator) is on the roadmap, but has not yet been completed.
* **Keep an eye on sparse secret attacks.** The security of sparse secrets is much less reliable than that of dense secrets. There is no standard for sparse secret parameters: they are not covered by the Homomorphic Encryption Standard or the Security Guidelines \[[4](https://eprint.iacr.org/2024/463)\], although there is an active working group. Attacks on sparse secrets continue to improve, and parameters that are secure today may need revisiting. If you plan on deploying sparse secrets, leave a margin.

## References

[1] M. R. Albrecht. "[On Dual Lattice Attacks Against Small-Secret LWE and Parameter Choices in HElib and SEAL](https://eprint.iacr.org/2017/047)." In *Advances in Cryptology – EUROCRYPT 2017, Part II*, LNCS vol. 10211, pp. 103–129. Springer, 2017.

[2] M. R. Albrecht, B. R. Curtis, and T. Wunderer. "[Exploring Trade-offs in Batch Bounded Distance Decoding](https://eprint.iacr.org/2019/1122)." In *Selected Areas in Cryptography – SAC 2019*, LNCS vol. 11959, pp. 467–491. Springer, 2019.

[3] B. Biasioli, E. Kirshanova, C. Marcolla, and S. Rovira. "[A Tool for Fast and Secure LWE Parameter Selection: the FHE Case](https://eprint.iacr.org/2024/1895)." Cryptology ePrint Archive, Paper 2024/1895, 2024.

[4] J.-P. Bossuat, R. Cammarota, I. Chillotti, B. R. Curtis, W. Dai, H. Gong, E. Hales, D. Kim, B. Kumara, C. Lee, X. Lu, C. Maple, A. Pedrouzo-Ulloa, R. Player, Y. Polyakov, L. A. Ruiz Lopez, Y. Song, and D. Yhee. "[Security Guidelines for Implementing Homomorphic Encryption](https://eprint.iacr.org/2024/463)." *IACR Communications in Cryptology*, 1(4), 2024.

[5] J.-P. Bossuat, J. R. Troncoso-Pastoriza, and J.-P. Hubaux. "[Bootstrapping for Approximate Homomorphic Encryption with Negligible Failure-Probability by Using Sparse-Secret Encapsulation](https://eprint.iacr.org/2022/024)." In *Applied Cryptography and Network Security – ACNS 2022*, LNCS vol. 13269, pp. 521–541. Springer, 2022.

[6] V. Lyubashevsky, C. Peikert, and O. Regev. "[On Ideal Lattices and Learning with Errors over Rings](https://eprint.iacr.org/2012/230)." In *Advances in Cryptology – EUROCRYPT 2010*, LNCS vol. 6110, pp. 1–23. Springer, 2010.

[7] O. Regev. "[On Lattices, Learning with Errors, Random Linear Codes, and Cryptography](https://arxiv.org/abs/2401.03703)." *Journal of the ACM*, 56(6):1–40, 2009.

[8] Y. Son and J. H. Cheon. "[Revisiting the Hybrid Attack on Sparse Secret LWE and Application to HE Parameters](https://eprint.iacr.org/2019/1019)." In *Proceedings of the 7th ACM Workshop on Encrypted Computing & Applied Homomorphic Cryptography (WAHC 2019)*, pp. 11–20. ACM, 2019.
