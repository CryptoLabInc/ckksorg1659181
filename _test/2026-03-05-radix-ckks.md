---
layout: post
title: >
  RadixCKKS: A General Framework for Integer Computation over CKKS
date: 2026-03-05 11:12:00-0400
description: >
  TL;DR: Radix-based approaches for handling large integers in FHE decompose an integer into small chunks, namely digits. These digits are then encoded as the coefficients of a polynomial, allowing integer arithmetic to be performed via polynomial arithmetic. However, after arithmetic operations, the resulting representation no longer remains unique, which makes it difficult to directly perform non-arithmetic operations such as comparison or bitwise operations. The process of restoring this disturbed digit representation back to a unique form is commonly referred to as digit carry, and this step inherently requires non-arithmetic processing. In this post, we introduce a two-step homomorphic digit carry algorithm that operates over CKKS. This algorithm restores the digit representation to its unique form using $O(\log k)$ bootstrappings.
author: Gyeongwon Cha
tags: 
categories: 
related_posts: false
toc:
  sidebar: right
giscus_comments: true
---

- Written by [Gyeongwon Cha](https://sites.google.com/view/cau-paiclab/home) (Chung-ang university)
- Based on [https://ia.cr/2025/1740](https://eprint.iacr.org/2025/1740) (Eurocrypt 2026)

_TL;DR: Radix-based approaches for handling large integers in FHE decompose an integer into small chunks, namely digits. These digits are then encoded as the coefficients of a polynomial, allowing integer arithmetic to be performed via polynomial arithmetic. However, after arithmetic operations, the resulting representation no longer remains unique, which makes it difficult to directly perform non-arithmetic operations such as comparison or bitwise operations. The process of restoring this disturbed digit representation back to a unique form is commonly referred to as digit carry, and this step inherently requires non-arithmetic processing. In this post, we introduce a two-step homomorphic digit carry algorithm that operates over CKKS. This algorithm restores the digit representation to its unique form using $O(\log k)$ bootstrappings._

---

<br />
## Introduction
<div style="margin-top: 1.5em;"></div>

Recently, the FHE community has shown growing interest in homomorphically evaluating integers of various sizes, ranging from machine-word-sized integers to RSA moduli. Surprisingly, 64-bit arithmetic appears quite simple from the plaintext perspective, much like multiplying two `long long` variables. In FHE, however, this is not straightforward, because the noise growth typically scales with the message size. Consequently, most existing approaches either maintain a sufficiently large gap between the message and the noise or decompose the message into smaller pieces and express the overall arithmetic through those pieces.

The radix-based approach represents a plaintext integer in base $B$. Once decomposed in this way, an integer can be viewed as a polynomial whose coefficients are its digits, and the original integer is recovered by evaluating that polynomial at $X=B$. As a result, arithmetic on radix-decomposed integers can naturally be carried out through polynomial arithmetic. The key advantage of this approach is that the digit representation still preserves much of the structure of the underlying integer. For example, to compare two integers, one can examine their digits sequentially from the most significant digit to the least significant one. In this sense, radix representations are highly flexible, since they leave room for extending arithmetic to non-arithmetic operations such as comparison.

The main challenge is that while polynomial arithmetic preserves the value of the represented integer, it does not preserve the uniqueness of its digit representation. After arithmetic operations, digit values may exceed their normal range, which in turn causes additional noise growth. More importantly, once the digit representation is no longer unique, non-arithmetic operations such as comparison can no longer be performed directly. Therefore, radix-based approaches must restore the non-unique digit representation to its unique form through digit carry.

This carry procedure, however, has remained a major bottleneck, since it inherently requires remainder computation and must process the digits sequentially. Although [1, 2] achieved homomorphic digit carry using discrete CKKS, the number of required bootstrappings remained linear in the plaintext bit-length $k$, that is, $O(k)$. This naturally leads to the following question: can this linear cost be reduced further?

<br />
## Key idea: reducing carry in base $B$ to carry in base $2$.
<div style="margin-top: 1.5em;"></div>

Our key idea for reducing the complexity of the carry algorithm is the following:

> If every digit is smaller than $2B-1$, then carry propagation on a radix-$B$ digit vector behaves exactly like carry propagation in binary.

To see why, recall that in base-$B$ carry, if the $i$-th digit $z_i$ is at least $B$, we propagate
$$
y_i = Q_B(z_i)
$$
to the next digit, where $Q_B(z_i)$ denotes the quotient of $$z_i$$ divided by $B$. The difficulty is that once $$y_i$$ is added to the $(i+1)$-th digit, the carry propagated to the $(i+2)$-th digit becomes
$
Q_B(z_{i+1} + y_i),
$
so the carry process becomes inherently sequential.

However, if every digit is bounded by $2B-1$, then a much simpler structure emerges. In this case, $Q_B(z_i)$ can be at most $1$. Consequently, $z_{i+1}+y_i$ is also at most $2B-1$, and therefore the carry propagated to the next digit is again at most $1$. Intuitively, this makes radix-$B$ carry behave like binary carry, where each position propagates only a single carry bit.

At this point, our problem boils down to the following two tasks:

1. Homomorphically reducing each digit so that it is smaller than $$2B-1$$.
2. Designing a carry algorithm for digit vectors whose entries are all smaller than $$2B-1$$.

<br />
## 2-step carry algorithm
<div style="margin-top: 1.5em;"></div>

**Polynomial arithmetic.** Since CKKS supports SIMD-style parallel operations across slots, a different method is needed to realize polynomial arithmetic. We simply use the DFT to evaluate polynomials in Fourier form, and then apply the iDFT to recover the result in coefficient form.

When the plaintext modulus is $$\mathbb{Z}_{B^k}$$, a single integer is packed into $$2k$$ slots: the first $$k$$ slots contain its radix-$$B$$ digits, while the remaining $$k$$ slots are padded with zeros. This zero-padding is introduced to avoid cyclic shifts. Accordingly, after the iDFT step, the lower $$k$$ slots are masked out and reset to zero.

Let the number of CKKS slots be $$N/2$$, and assume that $$2k \mid N/2$$. Then a single ciphertext can store a total of $$N/4k$$ integers, where the packing is obtained by simply concatenating digit vectors of length $$2k$$.


**Modular reduction in CKKS.** Modular reduction, as discussed in [3,4], is a key operation in our construction. At a high level, this algorithm first transforms a slot-encoded CKKS ciphertext into coefficient encoding, reduces it modulo the base modulus $$q_0$$, and then applies bootstrapping to recover a slot-encoded CKKS ciphertext.

The interesting point is that if the ciphertext scaling at level $$q_0$$ is adjusted to $$q_0/B$$, then the resulting ciphertext has exactly the same form as a coefficient-encoded BFV ciphertext with plaintext modulus $$B$$. Consequently, the message naturally undergoes the operation $$[\cdot]_B$$, while requiring only a single bootstrapping. For convenience, we denote the modular reduction algorithm with respect to $$B$$ by $$\mathsf{Mod}_B$$.

<br />
### Homomorphic Digit Reduction
<div style="margin-top: 1.5em;"></div>

After arithmetic operations, we repeatedly invoke $$\mathsf{Mod}_B$$ to reduce the digit size. Let the input digit vector be

$$
\mathsf{ct}\longleftrightarrow \vec z = (z_1,z_2,\dots,z_k)\in\mathbb{Z}^k.
$$

Here, we omit the last $$k$$ slots for simplicity.

Applying $$\mathsf{Mod}_B$$ yields

$$
\mathsf{ct}_{\mathsf{mod}}\longleftrightarrow \vec z_{\mathsf{mod}} = ([z_1]_B,[z_2]_B,\dots,[z_k]_B)\in\mathbb{Z}^k.
$$

Moreover, since
$$
Q_B = \frac{\mathsf{id}-\mathsf{Mod}_B}{B},
$$
we can additionally obtain, at the cost of one extra multiplication level,

$$
\mathsf{ct}_{Q}\longleftrightarrow \vec z_{Q} = (Q_B(z_1),Q_B(z_2),\dots,Q_B(z_k))\in\mathbb{Z}^k.
$$

Now, by rotating $$\mathsf{ct}_{Q}$$ one position to the right and adding it to $$\mathsf{ct}_{\mathsf{mod}}$$, we obtain another digit vector representing the same integer. If $$\|\vec z\|_{\infty}=U$$, then the infinity norm of the resulting digit vector is bounded by
$$
B + Q_B(U) = B + O(U/B).
$$

We call this entire procedure **LazyCarry**.

For the unique digit representations of two integers, no digit reduction is needed after addition. In contrast, after multiplication, invoking LazyCarry $$O(\log k)$$ times suffices to reduce all digit values below $$2B-1$$.

In practice, for $$B=16$$, multiplying two integers in unique digit representation requires only about 2 to 4 bootstrappings to reduce all digit values below $$2B-1$$, for bit-lengths ranging from 16 bits to 2048 bits. If a larger base $$B$$ is chosen, this number can be reduced even further.

Repeated iteration of LazyCarry reduce the digit size rapidly, making it possible to continue arithmetic operations once the digits become sufficiently small. This is in the same spirit as [2].

<br />
### Homomorphic Digit carry
<div style="margin-top: 1.5em;"></div>

We now take a closer look at the carry behavior of digit vectors whose entries are all bounded by $$2B-1$$. The figure  illustrates the case $$B=16$$ and $$k=4$$: the top shows carry propagation in base $$B$$, while the bottom shows the corresponding carry behavior after reduction to binary.

<div class="row mt-3">
    <div class="col-sm-12 mt-3 mt-md-0 mx-auto d-block">
        {% include figure.liquid loading="eager" path="assets/img/blog/2026_Gyeongwon/c.png" class="img-fluid rounded z-depth-1" zoomable=true %}
    </div>
</div>

Under this constraint, whenever the $$i$$-th digit propagates a value to the next digit, the $$i$$-th digit decreases by $$B$$ and the $$(i+1)$$-th digit increases by $$1$$. This is exactly the same behavior observed in the binary-reduced representation.

Therefore, if we can obtain a ciphertext encrypting a vector $\vec c$ whose entries indicate whether each digit propagates a carry to the next position—encoded as $1$ for true and $0$ for false—then the unique carried representation of the original digit vector $\vec z$ can be computed as follows : 

$$
z_{\mathsf{carried}} = \vec z - B\cdot\vec c + \rho_{-1}(\vec c)
$$

For example, in the figure, $\vec c = (1,1,1,0)$.

Reduction from a radix-$$B$$ representation to a binary representation is performed via a LUT operation. The binary reduction is determined by the range of each digit; more precisely, we define

$$
\phi(x)=
\begin{cases}
0, & \text{if } 0 \le x < B-1,\\
1, & \text{if } x = B-1,\\
2, & \text{if } B \le x < 2B-1.
\end{cases}
$$

It remains to design a function that determines, in the binary-reduced representation, whether a given digit propagates a value to the next position.

We begin with the two-digit case $$z_1,z_2$$, and design a function that determines whether $$z_2$$ propagates a carry to the next digit.

If $$z_2=0$$, then even if $$z_1=2$$ and propagates a carry into $$z_2$$, the resulting value is still smaller than $$2$$, and hence the output is $$0$$. If $$z_2=2$$, then for the same reason the output is always $$1$$, regardless of the value of $$z_1$$. The only nontrivial case is $$z_2=1$$. In that case, the output depends on $$z_1$$: if $$z_1=2$$, the output should be $$1$$; if $$z_1=0$$, it should be $$0$$; and if $$z_1=1$$, the output depends on the previous digit. In the two-digit example, this case evaluates to $$0$$.

Motivated by this observation, we design a bivariate function $$f(x,y)$$ that returns $$0$$ if carry propagation is false, $$2$$ if it is true, and $$1$$ if the result is not yet determined:

$$
f:\{0,1,2\}^2 \to \{0,1,2\}, \qquad
(x,y)\mapsto
\begin{cases}
0, & \text{if } y=0,\\
x, & \text{if } y=1,\\
2, & \text{if } y=2.
\end{cases}
$$

We then extend this to a $$k$$-digit vector $$(z_1,\dots,z_k)$$. The question of whether $$z_k$$ propagates a carry to the next position (the case $$i<k$$ will be discussed shortly) can be expressed recursively using rotations via the function $$f_k$$:

$$
f_k(z_1,\dots,z_k) = f\bigl(z_1,\, f_{k-1}(z_2,\dots,z_k)\bigr).
$$

At first glance, evaluating $$f_k$$ appears to require $$k$$ sequential calls to $$f$$. However, observing that the structure of $$f$$ is determined by its second argument, one can show that

$$
f_k(z_1,\dots,z_k)
=
f\bigl(f_{k/2}(z_1,\dots,z_{k/2}),\, f_{k/2}(z_{k/2+1},\dots,z_k)\bigr).
$$

Since the digits $$z_1,\dots,z_k$$ are stored across multiple slots, this allows us to evaluate $$f_k$$ using only $$\log k$$ invocations of $$f$$.

For the $$i$$-th digit with $$i\le k$$, the first $$k-i$$ slots correspond to zero-padded slots from the previous integer. Hence it suffices to evaluate

$$
f_k(0,\dots,0,m_1,\dots,m_i),
$$

since zeros do not affect the carry behavior at all.

After evaluating $$f_k$$, the positions that propagate a carry contain the value $$2$$, while the remaining positions contain $$0$$ or $$1$$. We then evaluate a mapping function $$\tau$$ that converts these values into $$1$$ and $$0$$, respectively. Finally, by applying $$\tau$$ and computing Equation~(1), the carry procedure is completed. We call this overall procedure **LazyCarry-to-Carry**.

<br />
### Whole Algorith Description
<div style="margin-top: 1.5em;"></div>

1. Evaluate Look-up Table $\phi$ :  $$\mathsf{ct}_{\mathsf{bin}} \gets \mathsf{CKKS.FBT}(\mathsf{ct}_{\mathsf{lazycarry}}, \mathsf{LUT}=\phi)$$
2. Evaluate $f_k$ : For $i=0$ to $\log (k)$ do \{ $$\mathsf{ct_{sym}}\gets$$ Evaluate $f(\mathsf{ct_{sym}}, \rho_{2^{-i}}(\mathsf{ct_{sym}}))$\}
3. Evaluate $\tau$ : $$ \mathsf{ct}_c \gets  \tau(\mathsf{ct_{sym}})$$
4. Return $$\mathsf{ct_{out}}\gets \mathsf{ct_{lazycarry}} - B\cdot \mathsf{ct}_c + \rho_{-1}(\mathsf{ct}_c)$$

Our algorithm performs one bootstrapping in Step 1 and invokes additional bootstrappings in Step 2. The extra bootstrappings in Step 2 arise in two cases: (1) when the remaining multiplicative depth is insufficient to evaluate the function $$f_k$$, or (2) when bootstrapping is needed for noise management. Despite these additional calls, their number remains modest in practice. The actual number of bootstrapping calls is reported in the Conclusion section.


<br />
## Another Operation
<div style="margin-top: 1.5em;"></div>

Because the digit vector can be restored to its unique representation, one can further design non-arithmetic operations such as comparison, subtraction, and conditional subtraction. Moreover, by using the bit-extraction technique of [5], each digit can be decomposed into bits, thereby enabling bitwise operations as well. These non-arithmetic operations can in turn be used to homomorphically implement reduction techniques such as folding and Montgomery reduction, thereby supporting computation not only over prime-power moduli but also over more general moduli. Although we would have liked to discuss these non-arithmetic operations in this post as well, we refer the interested reader to the paper for further details.


<br />
## Conclusion
<div style="margin-top: 1.5em;"></div>

We evaluated multiplication operations for bit-lengths ranging from 16 bits to 2048 bits. In the third column, $$a+b$$ means that $$a$$ bootstrappings were used in LazyCarry and $$b$$ bootstrappings were used in LazyCarry-to-Carry.

<div class="row mt-3">
    <div class="col-sm-12 mt-3 mt-md-0 mx-auto d-block">
        {% include figure.liquid loading="eager" path="assets/img/blog/2026_Gyeongwon/2.png" class="img-fluid rounded z-depth-1" zoomable=true %}
    </div>
</div>

To be completely honest, a single multiplication still took a considerable amount of time. Even though our method processes many integers at once, the total runtime is by no means small.

At first glance, BFV may appear more attractive, since homomorphic multiplication can be carried out simply by invoking the scheme’s native multiplication primitive. However, the main bottleneck in BFV lies in bootstrapping, whose runtime can in some cases exceed that of our entire multiplication procedure. In other words, the relevant comparison is not just raw multiplication speed, but rather

$$
\text{(BFV mult depth)} \times (\text{BFV mult time}) + (\text{BFV bootstrapping time})
$$ 

$$
\quad\text{vs.}\quad
$$ 

$$
\text{(BFV mult depth)} \times (\text{our multiplication time}).
$$

From an amortized perspective, a more careful comparison is also needed, since the number of available BFV slots depends on the plaintext modulus.

For DM/CGGI, by contrast, our method consistently shows better amortized performance. Interestingly, at the time of writing, our single-thread benchmark on the same machine showed that TFHE-rs required 77.5 seconds for 128-bit multiplication, whereas our method took 57.4 seconds. This indicates that from 128 bits onward, our method outperforms TFHE-rs not only in amortized throughput but also in latency.

Finally, we conclude by introducing a paper for readers interested in related work. While our work focuses on algorithms for performing carry homomorphically, the work introduced below is particularly impressive in that it avoids performing carry altogether.
- [6] : **REFHE: Fully Homomorphic ALU**


<br />
## References
<div style="margin-top: 1.5em;"></div>

[1] Kim, J. "Efficient homomorphic integer computer from ckks". TCHES 2025.

[2] Kim, J. "Faster homomorphic integer computer". Cryptology ePrint Archive, Paper
2025/1440 (2025).

[3] Alexandru, A., Kim, A., and Polyakov, Y. "General functional bootstrapping using
CKKS." CRYPTO 2025.

[4] Kim, J. and Noh, T. "Modular reduction in ckks." CIC 2025.

[5] Bae, Y., Kim, J., Stehlé, D., and Suvanto, E. "Bootstrapping small integers with ckks". ASIACRYPT 2024.

[6] Brakerski, Z., Friedman, O., Golan, D., Gurny, A., Mutzari, D., and Sheinfeld, O. "REFHE: Fully Homomorphic ALU." EUROCRYPT 2026

