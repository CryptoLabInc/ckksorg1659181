---
layout: post
title: >
  On the (In)security of Approximate Computation Protocols from CKKS
date: 2026-05-26 6:01:00+0200
description: >
  TL;DR: Recent advances in approximate HE, particularly CKKS, have significantly improved the practicality of secure computation, making it suitable for real-world applications involving approximate arithmetic. However, the inherent errors introduced by CKKS pose substantial challenges in the design and analysis of CKKS-based secure computation protocols. We investigate the correctness and security of existing CKKS-based MPC protocols relying on the noise smudging technique, in which each party independently adds exponentially large noise to the output. We show that thes constructions do not achieve standard simulation-based security for MPC. To address this issue, we apply an alternative method to address this issue, called collaborative sampling, in which all participating parties jointly generate additive shares of the smudging noise.
  We consider (1) asymmetric two-party protocols, and (2) symmetric multiparty protocols and present concrete secure constructions, explicitly define the corresponding ideal functionalities. Furthermore, we provide concrete implementations of round-efficient collaborative sampling protocols. To preserve the low round complexity inherent to HE-based protocols, we employ 1-out-of-2 Oblivious Transfer (OT) for the two-party setting and Discrete CKKS for the multi-party setting. As an alternative perspective, we show that existing protocols, despite failing to achieve standard simulation-based security, still satisfy a weaker security notion called liberal security for approximate MPC protocols.
author: Dongwon Lee
tags:
categories:
related_posts: false
toc:
  sidebar: right
giscus_comments: true
---

- Written by [Dongwon Lee](https://scholar.google.com/citations?user=-9Vi89QAAAAJ) (Seoul National University)
- Based on [https://ia.cr/2025/395](https://eprint.iacr.org/2025/395)

_TL;DR: Recent advances in approximate HE, particularly CKKS, have significantly improved the practicality of secure computation, making it suitable for real-world applications involving approximate arithmetic. However, the inherent errors introduced by CKKS pose substantial challenges in the design and analysis of CKKS-based secure computation protocols. We investigate the correctness and security of existing CKKS-based MPC protocols relying on the noise smudging technique, in which each party independently adds exponentially large noise to the output. We show that thes constructions do not achieve standard simulation-based security for MPC. To address this issue, we apply an alternative method to address this issue, called collaborative sampling, in which all participating parties jointly generate additive shares of the smudging noise.
We consider (1) asymmetric two-party protocols, and (2) symmetric multiparty protocols and present concrete secure constructions, explicitly define the corresponding ideal functionalities. Furthermore, we provide concrete implementations of round-efficient collaborative sampling protocols. To preserve the low round complexity inherent to HE-based protocols, we employ 1-out-of-2 Oblivious Transfer (OT) for the two-party setting and Discrete CKKS for the multi-party setting. As an alternative perspective, we show that existing protocols, despite failing to achieve standard simulation-based security, still satisfy a weaker security notion called liberal security for approximate MPC protocols._

---

<br />
# Introduction
<div style="margin-top: 1.5em;"></div>

The improvement in the practicality of HE makes it highly effective for secure outsourcing in cloud environments. It is widely used in both two-party computation (2PC) and multi-party computation (MPC) protocols, such as secure inference or federated learning, due to its low communication overhead and round complexity compared to generic MPC. While translating exact HE schemes (like BFV or BGV) into simulation-based secure MPC protocols is well-established by combining $\mathsf{IND} \text{-} \mathsf{CPA}$ security with circuit privacy or secure distributed decryption, the security of the underlying HE scheme does not automatically guarantee overall protocol security.

Among various HE schemes, the CKKS scheme has gained significant traction for privacy-preserving machine learning because it supports approximate arithmetic on real numbers. A key distinguishing feature of CKKS compared to exact HE schemes is that it interprets noise, whether intentionally added for security or incurred through homomorphic operations, as a part of the plaintext. Therefore, decrypting a CKKS ciphertext produces an approximate value, which inherently contains the accumulated error. While this approximate nature enhances computational efficiency, it introduces critical vulnerabilities; notably, revealing raw decryptions can lead to key-recovery attacks, which motivated the creation of the $\mathsf{IND} \text{-} \mathsf{CPA^D}$ security model [1] and subsequent research into countermeasures like noise smudging.

We also emphasize that analyzing these security elements, such as $\mathsf{IND} \text{-} \mathsf{CPA^D}$ security or circuit privacy, in isolation is fundamentally insufficient for designing end-to-end protocol. Existing security enhancement techniques fail to construct secure (CKKS-based) approximate computation protocols that achieve standard simulation-based security. Since security countermeasures in CKKS typically rely on adding extra noise that directly alters the underlying plaintext values, protocol designers cannot treat security and correctness as independent properties; instead, they require an integrated methodology that analyzes both jointly. Based on these observations, we raise the following questions:

> Is it possible to implement a CKKS-based protocol that achieves standard simulation-based security?

**Note**
Throughout this post, we only discuss 2PC case between a client and a server for the security analysis and construction of approximate computation protocol for the sake of explanation.

<br />
## Preliminaries: Standard Simulation-based Security
<div style="margin-top: 1.5em;"></div>

We first introduce about the atandard simulation-based security notion for the computation protocol.
* **$n$:** a number of parties.
* **$$f:(\{0,1\}^*)^n \rightarrow (\{0,1\}^*)^n$$:** a probabilistic polynomial-time (PPT) functionality.
* **$$\mathsf{view}_i^\Pi(\mathbf{x})$$:** a view of party $P_i$ consists of its input, random tape, and all messages received during the protocol.
* **$$\mathsf{output}_i^\Pi(\mathbf{x})$$:** an output of the protocol.

**Definition**
An $n$-party protocol $\Pi$ securely realizes a functionality $f$ if there exists a PPT simulator $\text{Sim}^\Pi$ such that for every corrupted subset of parties $$A \subseteq \{1, \dots, n\}$$ and every input vector $\mathbf{x}$, the following holds:

$$
\{(\text{Sim}^\Pi(A, (x_i)_{i\in A}, f_A(\mathbf{x})), f(\mathbf{x}))\} \approx_c \{(\mathsf{view}_A^\Pi(\mathbf{x}), \mathsf{output}^\Pi(\mathbf{x}))\}.
$$

The above privacy requirement asserts that the **joint distribution** of the simulator's output and the outputs of functionality should be indistinguishable from the view of the corrupted party and the outputs of parties.
This requirement is particularly meaningful when the functionality is probabilistic, as it guarantees that the adversary does not obtain any additional information about the output.


<br />
# System Model: Asymmetric 2PC protocol
<div style="margin-top: 1.5em;"></div>

Asymmetric two-party protocols constitute one of the most common applications of HE such as secure inference. In this setting, the **client** acts as a key owner and the **server** as an evaluator, collaboratively computing a public circuit $C$ on their respective private inputs $x$ and $y$ as follows.

1) The client generates a key pair, encrypts its private input, and sends the ciphertext and the evaluation key to the server.

2) The server homomorphically evaluates the circuit on the received ciphertext and its private input, and sends the resulting ciphertext back to the client.

3) The client decrypts the output ciphertext to obtain the final result and shares it with the server.

This baseline solution raises several security concerns. First, the decrypted value of a CKKS ciphertext may leak more information than the client intends.
On the other hand, the server also needs to ensure its input privacy, which is often referred to as circuit privacy in the HE context. Therefore, two aforementioned issues must be considered together for constructing a secure CKKS-based 2PC protocol.
Since a noise smudging technique is widely regarded as a standard countermeasure for achieving $\mathsf{IND} \text{-} \mathsf{CPA^D}$ security [2] and circuit privacy [3], existing CKKS-based 2PC protocols typically adopt noise smudging in both sides. In this case, the functionality output is $f(x,y) = C(c,y) + e_1 + e_2$ where $e_1$ and $e_2$ is independently sampled from the client ($P_1$) and the server ($P_2$), respectively.

<!-- <div style="text-align: center;">
  <img src="exist2PC.PNG" alt="Existing approximate 2PC protocol" style="display: block; margin: 0 auto; max-width: 65%;">
  <p>Existing approximate 2PC protocol</p>
</div> -->

<div class="row mt-3">
    <div class="col-sm-12 mt-3 mt-md-0 mx-auto d-block">
        {% include figure.liquid loading="eager" path="assets/img/blog/2606_Dongwon/exist2PC.PNG" class="img-fluid rounded z-depth-1" zoomable=true %}
    </div>
</div>
<div class="caption">
    Figure 1. Existing approximate 2PC protocol. 
</div>


<br />
# Security Issue: Insecurity of existing approximate 2PC protocol
<div style="margin-top: 1.5em;"></div>

We demonstrate that this protocol does not satisfy the simulation-based security, especially for the circuit $C(x,y) = x + y$.
Assume the client ($P_1$) is corrupted. We claim that there does not exist a PPT algorithm $\text{Sim}^{\Pi}$ that satisfies the standard simulation-based security condition.

$$
\{(\text{Sim}^\Pi(P_1, x, f(x,y)), f(x,y))\} \approx_c \{(\mathsf{view}_{P_1}^\Pi(x,y), \mathsf{output}^\Pi(x,y))\}.
$$

In a real execution of the protocol, the client naturally knows its own input $x$ and its locally sampled smudging noise $e_1$. Since the final protocol output is approximately the sum of all inputs and smudging noises ($z = x + y + e_1 + e_2$), a real-world adversary can easily calculate $z - x - e_1 = y + e_2$.

In the ideal world, however, the simulator only receives the client's input $x$ and the aggregated ideal output $z$. To satisfy simulation-based security, the simulator must generate a fake view containing a simulated noise $e'_1$ such that $z - x - e'_1$ is indistinguishable from $y + e_2$. Because the simulator has no knowledge of the server's private input y, it faces an impossible task. It cannot correctly decompose the aggregated sum to isolate a convincing $e'_1$ for all possible values of y, making the simulated view easily distinguishable from the real execution.

Similarly, it can be readily shown that no simulator exists for a corrupted server. When the server is corrupted, the smudging error $e_2$ becomes part of the adversary’s internal state.
Ultimately, because a valid simulator cannot be constructed for either party, the baseline protocol fails to satisfy standard simulation-based security requirements.

**Note**
In an exact HE setting, the final outputs of both the real-world protocol and the ideal-world functionality ($z=x+y$) are completely independent of the smudging errors ($e_1$ and $e_2$). Because the noise is entirely separated from the actual plaintext computation, the final decrypted result deos not affected by the smudging noise.
As a result, even if a corrupted party's simulator is given the specific smudging noise associated with that adversary, it is impossible for the simulator to derive any information more accurate than what is already provided by the ideal functionality. Therefore, we can construct the ideal-world simulation which is (computationally) indistinguishable from the real-world execution, thereby satisfying the requirements of standard simulation-based security.


<br />
# Our Construction: Secure approximate 2PC protocol
<div style="margin-top: 1.5em;"></div>

As discussed in the previous section, existing formulations of $\mathsf{IND} \text{-} \mathsf{CPA^D}$ security and circuit privacy for CKKS do not adequately capture the security requirements of CKKS-based approximate protocols.
A key insight from our analysis is that security cannot be achieved if any party retains non-negligible information about the smudging error, as no simulator can reconstruct the view of that party using only the ideal functionality.
As a result, we address this issue from the following key idea:

> If each party is independent to the smudging error, the protocol achieve the simulation-based security.

In order to achieve this protperty, we modify the error generation procedure, called **collaborative sampling**. The functionality of the collaborative sampling is generating a single smudging error $e$ from a smudging distribution and divides it into two random additive shares, $r_1$ and $r_2$, such that $r_1 + r_2 = e$. Because each individual share is statistically indistinguishable from a uniformly random element, neither party obtains any partial knowledge about the total smudging error $e$ in isolation.

By utilizing the collaborative sampling, we can construct the secure approximate 2PC protocol. During the protocol, the client encrypts its input, and the server homomorphically evaluates the circuit with their private input. To maintain circuit privacy, the server adds its secret noise share $r_2$ directly to the evaluated ciphertext before sending it to the client. The client then decrypts the received ciphertext while simultaneously factoring in its own noise share $r_1$. This reconstructs the final output, which is statistically identical to $z=C(x,y) + e$.

<!-- <div style="text-align: center;">
  <img src="secure2PC.PNG" alt="Secure approximate 2PC protocol" style="display: block; margin: 0 auto; max-width: 80%;">
  <p>Secure approximate 2PC protocol</p>
</div> -->

<div class="row mt-3">
    <div class="col-sm-12 mt-3 mt-md-0 mx-auto d-block">
        {% include figure.liquid loading="eager" path="assets/img/blog/2606_Dongwon/secure2PC.PNG" class="img-fluid rounded z-depth-1" zoomable=true %}
    </div>
</div>
<div class="caption">
    Figure 2. Secure approximate 2PC protocol. 
</div>

In the previous (insecure) protocol, knowing one's own noise allowed an adversary to extract a more precise approximation than the ideal functionality intended to reveal. In this secure protocol, because the individual noise shares are entirely decoupled from the actual total error $e$, neither the client nor the server can derive additional information than the ideal functionality. More precisely, we can construct the simulator against the adversarial client ($P_1$) as below.

1) Generate key pair $(sk, pk)$ and encrypt the client's private input $$\mathsf{ct}_\mathsf{in} \leftarrow \mathtt{Enc}_{pk}(x)$$.

2) Sample $r_1 \leftarrow R_q$ and let $u':= z-r_1$ for the ideal functionality $z$.

3) Sample $a_\mathsf{out} \leftarrow R_q$ and let $$\mathsf{ct'}_\mathsf{out} := (a_\mathsf{out} \cdot s + u', a_\mathsf{out})$$.

4) Output $$(x, r_1, sk, pk, \mathsf{ct}_\mathsf{in}, \mathsf{ct'}_\mathsf{out})$$.

We show that the output of the simulator $\text{Sim}^{P_1}_{\text{secure2PC}}(x, z)$ is computationally indistinguishable with the joint distribution of $P_1$'s view and the real execution output.

$$
\begin{array}{cl}
& \{\text{view}^{\Pi_{\text{secure2PC}}}_{P_1}(x,y), \text{Out}^{\Pi_{\text{secure2PC}}}(x,y)\} \\
\equiv\,\, & \{(..., \text{ct}_{\text{out}}':= \text{ct}_{\text{out}}+\text{ct}_{\text{zero}} + (r_2, 0)), C(x,y) + e_{\text{out}} + r_1 + r_2 \} \\
\approx_s & \{(..., \text{ct}_{\text{out}}':= \text{ct}_{\text{out}}+\text{ct}_{\text{zero}} + (e - e_{\text{out}} - r_1, 0)), C(x,y)+e_{\text{out}} + e - e_{\text{out}}\} \\
\equiv\,\, & \{(..., \text{ct}_{\text{out}}'= ((a_{\text{out}} + a_{\text{zero}}) s + C(x,y) + e - r_1, a_{\text{out}}+a_{\text{zero}})), C(x,y) + e \} \\
\approx_c & \{(..., \text{ct}_{\text{out}}'= (as + z - r_1, a)), z \} \\
\equiv\,\, & \{(\text{Sim}^{P_1}_{\text{secure2PC}}(x, z), z )\}.
\end{array}
$$


The statistical indistinguishability follows from the assumption that $e$ is an smudging error, while the computational indistinguishability is derived from the fact that the distribution of $a_\mathsf{zero}$ obtained from $$\mathsf{ct}_\mathsf{zero}=(b_\mathsf{zero}, a_\mathsf{zero}) \leftarrow \mathsf{Enc}_{pk}(0)$$ is indistinguishable from a uniform distribution over $R_q$ under the RLWE assumption.


<br />
# Implementation: Collaborative Sampling
<div style="margin-top: 1.5em;"></div>

Now, we describe efficient collaborative sampling protocols that securely generate the shared smudging noise required for standard simulation-based security in CKKS-based systems. Instead of using generic MPC frameworks that suffer from high communication overhead, we provide protocols offering round-efficient implementations optimized for both two-party (2PC) and multi-party (MPC) settings.

**Note**
In the case of security analysis and protocol construction, 2PC naturally extends to MPC; however, in the case of collaborative sampling, we will explain both scenarios because they were implemented using distinct cryptographic primitives. 

<br />
## Unified Mechanism for Uniform Error Distribution
<div style="margin-top: 1.5em;"></div>

The uniform distribution is the most widely applied distribution for noise smudging. To generate a collaborative smudging error from a uniform distribution $\mathcal{D}$:

* **Shared Random Bits:** The process consumes $k = \log(E) + \lambda$ additive shares of random bits ($b_j \in \{0,1\}$), where $k$ is determined by the upper bound of the smudging error $E$ and the security parameter $\lambda$.
* **Local Reconstitution:** Each party locally scales and combines their bit shares to derive their final additive error share:
  $$r_i=\sum_{j=0}^{k-1} 2^j r_{i, j}$$
where $r_{i,j}$ denotes party $i$'s additive share of the random bit $b_j$.

This technique can be extended across polynomials ($R$) by evaluating each coefficient independently.

<br />
## Two-Party Bit-Sharing via Oblivious Transfer
<div style="margin-top: 1.5em;"></div>

In a two-party environment, the required random bit shares are generated efficiently via a 1-out-of-2 Oblivious Transfer (OT) protocol:

* **The Process:** The sender ($P_1$) samples a random bit $b$ and a local mask $r_1$, preparing masked values $(m_0, m_1)=(b-r_1, 1-b-r_1)$ for the transfer. The receiver ($P_2$) samples a selection bit $\sigma$ and fetches the corresponding value $m_\sigma$ through the OT mechanism.
* **Optimization:** The protocol instantiates this using a random OT baseline combined with Beaver's OT derandomization technique. This approach turns a random OT into a sender-chosen OT with only one additional round of communication. Because all instances can run in parallel, the round complexity remains constant.

<br />
## Multi-Party Bit-Sharing via Discrete CKKS
<div style="margin-top: 1.5em;"></div>

For multi-party settings ($n > 2$), the protocol leverages the cryptographic properties of **Discrete CKKS** [4] alongside specialized bootstrapping to minimize network communication:

* **Initial Encryption:** Each party generates a key pair, samples a polynomial with binary coefficients, and broadcasts an encrypted version under a small modulus ($q_0$).
* **Aggregating and Scaling:** The individual ciphertexts are aggregated linearly to create a encryption containing a uniformly random bit string. The parties then apply **Binary Bits Bootstrapping** [4] and a cleaning operation to securely expand the plaintext.
* **Distributed Decryption:** The parties obtain additive shares of random bit after decrypting the aggregated ciphertext. During the decryption, we use the masking technique [5], generating an additive share of zero by securely exchanging PRF keys, to hide the information about random bit.

As described in [6,7], secure distributed decryption in both synchronous and asynchronous setting can be achieved by having each party exchange pairwise (key homomorphic) PRF seeds.
Since both the PRF and the corresponding seeds are already necessary components in the synchronous and asynchronous settings, respectively, the proposed masking technique introduces essentially no additional overhead to our protocol.

<br />
## Benchmark
<div style="margin-top: 1.5em;"></div>

We implement and benchmark the protocols for collaborative sampling in both two-party and multi-party cases. All experiments were performed with a single thread on a machine with an Intel(R) Xeon(R) Platinum 8268 CPU running at 2.90GHz and 384GB of RAM.

<div style="display: flex; justify-content: center; margin-bottom: 1.0em;">
<table style="border-collapse: collapse; border: 1px solid">
  <thead>
    <tr style="border-bottom: 2px solid ">
      <th style="border: 1px solid; padding: 6px 12px;">#(bit shares)</th>
      <th style="border: 1px solid; padding: 6px 12px;">System Model</th>
      <th style="border: 1px solid; padding: 6px 12px;">Time(s)</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td rowspan="2" style="border: 1px solid; padding: 6px 12px; text-align: center;">$2^{16}$</td>
      <td style="border: 1px solid; padding: 6px 12px;">2 party</td>
      <td style="border: 1px solid; padding: 6px 12px;">0.12</td>
    </tr>
    <tr>
      <td style="border: 1px solid; padding: 6px 12px;">multi-party</td>
      <td style="border: 1px solid; padding: 6px 12px;">33.96</td>
    </tr>
    <tr>
      <td rowspan="2" style="border: 1px solid; padding: 6px 12px; text-align: center;">$2^{18}$</td>
      <td style="border: 1px solid; padding: 6px 12px;">2 party</td>
      <td style="border: 1px solid; padding: 6px 12px;">0.41</td>
    </tr>
    <tr>
      <td style="border: 1px solid; padding: 6px 12px;">multi-party</td>
      <td style="border: 1px solid; padding: 6px 12px;">135.84</td>
    </tr>
  </tbody>
</table>
</div>

For the two-party case, we used LibOTe library with the OT extension to generate bit shares for $\log q \approx 128$.
For the multi-party case, we used Lattigo library to implement discrete CKKS. We use the parameters $N = 2^{16}, \log QP \approx 1200$, so that a single protocol creates $2^{16}$ bit shares. We also set the parameters so that after the protocol $157$ bits of modulus is left with $\log \Delta \approx 60$ and $\approx 2^{-47}$ bits of precision.
Hence, we can set $\log q \approx 90$ and support up to $2^7 = 128$ parties with 40 bits of statistical security.
We also note that we only implement the bootstrapping and the cleaning part, as it is the main bottleneck of the protocol.


<br />
# Liberally Secure approximate 2PC protocol
<div style="margin-top: 1.5em;"></div>

We also investigate a relaxed, alternative security framework termed **liberal security**, inspired by [8]. Unlike the standard definition, in which the simulator relies solely on the ideal functionality's output, the liberal definition grants the simulator access to auxiliary information.

**Definition**
Let $\Pi$ be an $n$-party protocol realizing a functionality $f$. We also define an auxiliary information $\hat{f}$ for the functionality $f$. We say $\Pi$ is liberally secure if there exists a PPT simulator $\text{Sim}^\Pi$ such that for every corrupted subset of parties $$A \subseteq \{1, \dots, n\}$$ and every input vector $\mathbf{x}$, the following holds:

$$
\{ (\text{Sim}^{\Pi}(A, (x_i)_{i \in A}, f_A(\mathbf{x}), \hat{f}_A(\mathbf{x})), f(\mathbf{x})) \} \approx_c \{ (\mathsf{view}_A^{\Pi}(\mathbf{x}), \mathsf{output}^{\Pi}(\mathbf{x})) \}
$$

Liberal security guarantees that the adversary cannot obtain more information than the adversary that is given access to both the ideal functionality $f$ and the auxiliary information $\hat{f}$. It is the main difference between liberal security and standard MPC security notion. More precisely, liberal security guarantees that the protocol reveals no additional private information beyond that already disclosed by the pair $(f, \hat{f})$, whereas the standard simulation-based definition restricts leakage solely to the information revealed by the ideal functionality $f$.

<br />
### Security Analysis of Existing 2PC protocol ###
<div style="margin-top: 1.5em;"></div>

Under this definition, we prove that existing CKKS-based protocols (which utilize party-wise noise smudging and fail to achieve standard security) formally satisfy this relaxed security notion where the auxiliary information is an exact computation result ($\hat{z} = C(x,y)$). 
To prove the security of the existing 2PC protocol, we assume the case where the client is corrupted. Then, we can construct a simulator for the adversarial client as below.

1) Generate key pair $(sk, pk)$ and encrypt the client's private input $$\mathsf{ct}_\mathsf{in} \leftarrow \mathtt{Enc}_{pk}(x)$$.

2) Let $$e := z - \hat{z}$$ and sample $$(e_1, e_2) \leftarrow \{(e_1, e_2) \in \mathcal{D} \times \mathcal{D} \mid e_1 + e_2 = e\}$$.

3) Sample $$a_\mathsf{out} \leftarrow R_q$$ and let $$\mathsf{ct'}_\mathsf{out} := (a_\mathsf{out} \cdot s + e_2, a_\mathsf{out})$$.

4) Output $$(x, r_1, sk, pk, \mathsf{ct}_\mathsf{in}, \mathsf{ct'}_\mathsf{out})$$.

Unlike the definition of standard security, the simulator also obtains the exact computation result as an auxiliary information for the inputs. Therefore, the simulator can extract approximation error by subtracting $\hat{z}$ from $z$, and it enables to generate the adversary's view that satisfying the desired condition of the security notion.
This security proof guarantees that existing 2PC protocol leaks no more information than can be derived from $(f, \hat{f})$ where $\hat{f}$ returns the exact evaluation result for a certain circuit $C$.

As such, the satisfaction of existing protocols with liberal security provides a theoretical justification for widely deployed protocols, showing that they are not completely insecure but rather offer a minimum security guarantee.

<br />
# Conclusion
<div style="margin-top: 1.5em;"></div>

In this work, we show that existing CKKS-based 2PC and MPC protocols fail to achieve the standard simulation-based notion of MPC security. To address this limitation, we introduce a collaborative sampling technique for noise smudging and construct CKKS-based protocols that achieve the standard security definition by integrating this technique. In addition, we provide the notion of liberal security as a relaxed security definition, and demonstrate that existing CKKS-based protocols for approximate computation satisfy this liberal security.


<br />
## References
<div style="margin-top: 1.5em;"></div>

[1] Baiyu Li and Daniele Micciancio. "On the Security of Homomorphic Encryption on Approximate Numbers." EUROCRYPT 2021.

[2] Baiyu Li, Daniele Micciancio, Mark Schultz, and Jessica Sorrell. "Securing Approximate Homomorphic Encryption using Differential Privacy." CRYPTO 2022.

[3] Kamil Kluczniak and Giacomo Santato. "On Circuit Private, Multikey and Threshold Approximate Homomorphic Encryption." IACR CiC 2025 (2). 

[4] Youngjin Bae, Jung Hee Cheon, Jaehyung Kim, and Damien Stehlé. "Bootstrapping Bits with CKKS." EUROCRYPT 2024.

[5] Rafael del Pino, Shuichi Katsumata, Mary Maller, Fabrice Mouhartem, Thomas Prest, and Markku-Juhani Saarinen. "Threshold Raccoon: Practical Threshold Signatures from Standard Lattice Assumptions." EUROCRYPT 2024.

[6] François Colin de Verdière, Alain Passelègue, and Damien Stehlé. "On Threshold Fully Homomorphic Encryption with Synchronized Decryptors." IACR ePrint 2026.

[7] Ehsan Ebrahimi and Anshu Yadav. "Strongly Secure Universal Thresholdizer." ASIACRYPT 2024.

[8] Joan Feigenbaum, Yuval Ishai, Tal Malkin, Kobbi Nissim, Martin J. Strauss, and Rebecca N. Wright. "Secure Multiparty Computation of Approximations." ICALP 2001.