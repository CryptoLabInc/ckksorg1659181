// get the ninja-keys element
const ninja = document.querySelector('ninja-keys');

// add the home and posts menu items
ninja.data = [{
    id: "nav-home",
    title: "home",
    section: "Navigation",
    handler: () => {
      window.location.href = "/ckksorg1659181/";
    },
  },{id: "nav-blog",
          title: "blog",
          description: "",
          section: "Navigation",
          handler: () => {
            window.location.href = "/ckksorg1659181/blog/";
          },
        },{id: "dropdown-publications",
              title: "publications",
              description: "",
              section: "Dropdown",
              handler: () => {
                window.location.href = "/ckksorg1659181/publications/";
              },
            },{id: "post-bootstrapping-discrete-data-with-ckks",
        
          title: "Bootstrapping Discrete Data with CKKS",
        
        description: "TL;DR: Recently, a new paradigm called discrete CKKS, which picks the best aspects of CKKS and other exact schemes has been suggested. To be more specific, it uses CKKS (a.k.a. the approximate homomorphic scheme) to compute over discrete data. In this article, we discuss the recent discrete bootstrapping in BKSS24 specifically designed for discrete CKKS.",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/ckksorg1659181/blog/2025/Jaehyung/";
          
        },
      },{id: "post-grafting-improving-performance-and-usability-of-homomorphic-encryption",
        
          title: "Grafting: Improving Performance and Usability of Homomorphic Encryption",
        
        description: "TL;DR: Grafting is a new approach for managing a CKKS ciphertext modulus. With so-called sprouts, we dedicate a few machine words to scaling and use word-sized primes for the remaining ciphertext modulus improving performance. With universal sprouts, we can represent any bit size up to the word size using powers-of-two and introduce arbitrary scaling for RNS-CKKS improving usability for parameter and circuit design.",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/ckksorg1659181/blog/2025/Johannes/";
          
        },
      },{id: "news-ckks-org-comes-alive",
          title: 'CKKS.org comes alive!',
          description: "",
          section: "News",},{
        id: 'social-email',
        title: 'email',
        section: 'Socials',
        handler: () => {
          window.open("mailto:%79%6F%75@%65%78%61%6D%70%6C%65.%63%6F%6D", "_blank");
        },
      },{
        id: 'social-rss',
        title: 'RSS Feed',
        section: 'Socials',
        handler: () => {
          window.open("/ckksorg1659181/feed.xml", "_blank");
        },
      },];
