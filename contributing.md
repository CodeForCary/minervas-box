# Contribution Guide

## Issues

The repository uses Github Issues to track changes and requirements. Github issues is a great tool as you can comment and communicate around a specific topic.

### Using Issues

- Try your best to keep an issue updated and accurate. 
- If you are working on a task, assign it to yourself.
- Utilize labels to categorize the issue for others to understand it's state

### Creating an Issue

Use issues to discuss a feature or bug. In a discussion issue, we can close it once a decision is made and create a new issue for the decided upon solution.

Try to be as descriptive as possible in the issue. Features should have as many requirements as possible. Features should use the [Gherkin syntax](https://github.com/cucumber/cucumber/wiki/Gherkin) whenever possible. This helps verify requirements are correct.

For bugs, include a [LiceCap](http://www.cockos.com/licecap/) screencapture of the bug, if possible. Also include reproduce steps or a url (if applicable).

Comment on issues. **There is no such thing as a stupid question!** If you feel it is important, then say something. Issues can serve as documentation and a learning tool, as much as it is also a tracking tool. So, asking a question, even if you feel it simple, can help others learn.

### Resolving issues

Issues should only be closed in conjusction with a pull request or a specific tag:
- Won't Fix
- Duplicate

Make sure to always include a comment when closing an issue.

## Docs

The tech stack includes [DocumentJS](http://documentjs.com/) which is a great tool that builds an HTML site from doc blocks in the code and from markdown files as well.  Keeping the documentation up to date is important for others to complete items effectively. Changing an api or creating a new component can help someone else complete a task.

TODO: Include documentation rules and examples

To build docs, run: `npm run docs`. This exexutes the docuemtation script that essentially just runs DocumentJS.

## Tests

The tech stack includes [Qunit](https://qunitjs.com/) for running tests. Using [StealJS](http://stealjs.com/) to pacakge the modules, we can run tests easily in the browser with a simple configuration.

To run tests in a browser, run: `npm run develop`. This starts a web server on the root folder. You can then browse to the individual test.html files in the file structure.

TO run tests in the console, run: `npm run tests`. This runs tests using [Testee](https://github.com/bitovi/testee) and will open supported browsers or PhantomJS.

## Code

The tech stack includes [CanJS](http://canjs.com/), we therefore use a lot of web components. Web components are amazing. More accurately, though, we use the [Modlet Workflow](http://blog.bitovi.com/modlet-workflows/). Very quickly, this means that the file structure adheres to the following:

- src
 - components
 - models
 - pages
 - utils
- test
 - components
 - models
 - pages
 - utils

A Modlet should include the following:

- A working demo
- Documentation that renders when docs are built
- Passing tests
- The Modlet
 - Component declaration
 - View Model file
 - Template

### Cloning, git-flow

To get a copy of the code base, create a folder and clone the project using `git`. Branch from `master` or `minor` depending on what the issue is. Always work from a feature branch.

### Setting up local server

The tech stack includes [StealJS](http://stealjs.com/) which is a module loader, among other things. Demos and the main index file will load Steal and compile the app on the fly. To run a local server simply run: `npm run develop`. Opening a browser to the resulting port, something like `localhost:3000` should render the application almost immediately.

### Creating a Pull Request

Before opening a PR, make sure you verify your code. Run `npm run build`. This runs tests, a linting tool, and the build script. Verying that the entire script completes without errors will save you time.

Once verified, push your code to your feature/bug branch and create the pull request. Your pull request should always merge into `minor` unless otherwise specified.  The `minor` branch is merged into `master` concurrently with a release.

### Updating changelog

Please keep the changelog updated. [This is a good place to start with adding to the changelog](http://keepachangelog.com/).
