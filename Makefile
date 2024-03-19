all: publish

.SUFFIXES:

file = dotfiles-$(shell git describe).vsix
tag = $(shell git describe --abbrev=0 | awk -F. -v OFS=. '{$$NF++ ; print}')

.PHONY changelog: CHANGELOG.md
CHANGELOG.md: .git/refs/heads/main
	echo "# Changelog\n### ${tag}" >$@
	git log --oneline --decorate-refs='tags/*' --format="%(decorate:prefix=### ,suffix=%n,tag=)%n- %w(0,0,2)%B" >>$@

version: CHANGELOG.md
	npm version ${tag} --no-git-tag-version
	git add package.json package-lock.json CHANGELOG.md
	git commit --amend --no-edit
	git tag -afsm "" ${tag}
	git push origin main ${tag}

.PHONY package: ${file}
${file}: version
	npx vsce package

publish: ${package} CHANGELOG.md
	npx vsce publish ${tag} -i ${package}
	git log $(git describe --tags --abbrev=0 @^).. | gh release create ${tag} --notes-file - ${package}
