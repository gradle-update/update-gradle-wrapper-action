# Releasing

Refer to this document for [versioning](https://github.com/actions/toolkit/blob/master/docs/action-versioning.md) best practices.

To cut a new release:

- **Create a new GitHub release and publish it to Marketplace (on GH)**
  - Update CHANGELOG.md
  - Create a [new release](https://github.com/gradle-update/update-gradle-wrapper-action/releases/new)
  - Make sure "Publish this Action to the GitHub Marketplace" is selected
  - Enter a new tag name `v1.2.3` to create a new tag on publish
  - Enter release title "Update Gradle Wrapper Action v1.2.3"
  - Leave release description empty
  - Check the new release appears on [Marketplace](https://github.com/marketplace/actions/update-gradle-wrapper-action)
- **Move the `v1` tag (locally)**
  - `git pull`
  - `git tag -fa v1 -m "Update v1 tag to v1.2.3"`
  - `git push origin v1 --force`
