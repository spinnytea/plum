Database
========

This represents Knowledge in the learning process.

The lowest level (ideas) is an infinite graph.

Subgraph represents a subset of the infinite graph, and is used in a few ways.

- Find sections of the infinite graph.
- Find sections of a subgraph.
- Explore possibility spaces.


The infinite graph (ideas) represents WHAT IS. It represents facts that the machine knows about the world. The current state of things.
This can be directly manipulated by sensors, it can be manipulated by plans (when actually carrying them out).

A subgraph is used to identify a section of the idea graph that we care about at the moment. This is often called a context, and maps directly to the idea graph (concrete).

A subgraph can also map to another subgraph, allowing for more abstract representation. These are used for planning, imagination, or any other kind of possibility space exploration.
These more abstract subgraphs form the basis for actions that can be performed.

<!-- TODO make a graphic instead of 'pre' text -->
<pre>
                +---------------+  > Subgraph
               /               /
          +---/               /-+  > Subgraph (context)
         /   +---------------+ /
    +---/                     /-+  > Ideas
   /   +---------------------+ /
  /                           /
 /                           /
+---------------------------+
</pre>
