.SUFFIXES:
version = $(shell git describe | tr "-" "." | awk -F. -vOFS=. '{if (NF>3) {NF=3; $NF++;} print}' | cut -c 2-)
file = dotfiles-${version}.vsix
vsce-flags =

all: ${file}

CHANGELOG.md: .git/refs/heads/main
	echo "# Changelog\n### v${version}" >$@
	git log --oneline --decorate-refs='tags/*' --format="%(decorate:prefix=### ,suffix=%n,tag=)%n- %w(0,0,2)%B" >>$@

.git/refs/tags/v${version}: CHANGELOG.md
	npm version ${version} --no-git-tag-version
	git add package.json package-lock.json CHANGELOG.md
	git commit --amend --no-edit
	git tag -afsm "" v${version}
	git push origin main v${version}

${file}: CHANGELOG.md .git/refs/tags/v${version}
	npx vsce package ${vsce-flags} ${version}
	npx vsce publish -i ${file} ${vsce-flags}
	git log --oneline --decorate-refs='tags/*' --format="- %w(0,0,2)%B" (git describe --tags --abbrev=0 @^)... | gh release create v${version} --notes-file - ${file}
