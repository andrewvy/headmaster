# Headmaster

He's here to help you manage.

# Setup

`npm start`

sample src/config.js

	module.exports = { slack_token: 'API_TOKEN',
		slack_group: 'headmaster_test',
		github_username: 'andrewvy',
		github_api_token: 'API_TOKEN',
		github_organization_name: 'andrewvy',
		github_repo: 'headmaster',
		wit_api_token: 'API_TOKEN' }


You can grab your Slack API token by creating a [new Bot Integration](https://slack.com/services/new/bot)  
You'll also need a [GitHub Access Token](https://github.com/settings/tokens)  
And a [Wit.ai Server Token](https://wit.ai/) for NLP.

# Wit.ai Intents and Entities

`get_issues` - "Can you find me tickets with the label priority:high"

ENTITY = `github_label`  
`priority:high` = `github_label`  

`create_issue` - "Can you create a ticket with the title 'This thing is broken'"

ENTITY = `title`  
`This thing is broken` = `title`
