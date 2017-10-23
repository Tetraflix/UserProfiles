# Tetraflix: User Profiles Service

The User Profiles Service manages user genre preference profiles and movie watch history for all Tetraflix users. The service constantly interprets session data to model and update user genre preferences profile, which is a collection of genres and numbers (0 - 100) representing user's preference to the respective genre. For the users in the Control group, their genre preference profiles are fixed to the initial stated genre preferences. For the users in the Experimental group, their genre preference profiles are updated based on exponentially weighted moving average (EXMA) of movie profiles to take into consideration content drift of user preference.

## Roadmap

View the project roadmap [here](LINK_TO_DOC)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidelines.

# Table of Contents

1. [Usage](#Usage)
1. [Requirements](#requirements)
1. [Development](#development)
    1. [Installing Dependencies](#installing-dependencies)
    1. [Tasks](#tasks)

## Usage

> Some usage instructions

## Requirements

- Node 6.9.x
- Redis 3.2.x
- Postgresql 9.6.x
- etc

## Other Information

(TODO: architecture diagram, schema, and input/output documentation)

