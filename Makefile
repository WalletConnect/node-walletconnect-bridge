# Licensed under MIT.
# Copyright (2016) by Kevin van Zonneveld https://twitter.com/kvz

define npm_script_targets
TARGETS := $(shell node -e 'for (var k in require("./package.json").scripts) {console.log(k.replace(/:/g, "-"));}')
$$(TARGETS):
	yarn run $(subst -,:,$(MAKECMDGOALS))

.PHONY: $$(TARGETS)
endef

$(eval $(call npm_script_targets))

