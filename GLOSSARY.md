# OpenCode Lovely Bash Permissions

A plugin that decides whether OpenCode may run each bash command, using the same policy vocabulary as the Pi and Devin clients.

## Language

**Verdict**:
The answer for one command line: `allow`, `ask`, or `deny`, with reasons. The engine gives it, or the plugin's fallback level does when the engine fails for that command.
_Avoid_: result, decision, block

**Allow**:
A verdict that runs the command without asking the user.

**Ask**:
A verdict that requires the user to approve the command before it runs.

**Deny**:
A verdict that stops the command from running.
_Avoid_: block (Devin's wire word)

**Policy**:
The `bash` block of a mode in the config file. It decides verdicts for bash commands.
_Avoid_: config, rules

**OpenCode policy**:
An OpenCode rule that can deny an action regardless of permission rules; it cannot allow an action. It is distinct from this plugin's **Policy** and **Mode**.

**Policy file**:
A configuration file containing one or more modes, each with a bash policy.

**Mode**:
A named choice of bash policy in a policy file. The `default` mode is required.

**Engine**:
The bash evaluator from `lovely-bash-permissions`. It takes one policy and one command line and returns a verdict.
_Avoid_: parser

**Permission request**:
OpenCode's prompt asking the user to approve a tool action. This plugin sets its effect and message.
_Avoid_: permission (alone, since OpenCode uses that word for its own rules)

**Reason**:
One line explaining a verdict. Several reasons show as bullets.
_Avoid_: approve reason, approval reason

**Brand label**:
The `[♡ perms: …]` prefix on every message this plugin shows, naming the verdict (for example `💛 REQUIRES-USER-APPROVAL`).
_Avoid_: tag, header

**Ask banner**:
The display of a pending ask's reasons while the user decides. It disappears once the ask is answered.
_Avoid_: prompt, notice

**Deny message**:
The message for a denied command. It carries the brand label and the reasons, and the agent reads it.
_Avoid_: error, tool error

**Pi extension**:
`lovely-pi-permissions`, the TypeScript Pi client that runs the engine.
_Avoid_: lovely-pi-bash-permissions (that is the engine's CLI)
