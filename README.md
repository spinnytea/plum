Project Structure
=================
* `/src` source code
    * top level functions: these are on the exports object directly, they are the public methods
    * units: these are just to break out the code into - ya' know - functions; placed on an object to test individually; think of them as private methods
    * boundaries: these are integration-y boundaries, units are entirely internal to the functionality, and boundaries interact with other parts of the code
* `/unit` unit tests
    * always mock boundaries
    * mock out units whenever it make sense
    * test every unit function in every way it's meant to be tested
    * thurough coverage, make sure all the pieces work
* `/spec` integration tests
    * do not mock anything
    * test the top level functions
    * test the boundaries
    * simple tests to ensure everything works together
    * these should be "true to life" examples, or example implementations to follow
