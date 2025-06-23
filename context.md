[](https://monzoflow.com/)

<aside>
💡 Domains is purchased on Squarespace domains as Google Domains is moving over under personal Gmail account

</aside>

[](https://account.squarespace.com/domains)

# Github Repository

https://github.com/b1scuit/monzoflow

# Problem Statement

People find issue with tracking the flow of money in their personal finances, with this a Sankey Diagram can better show the path of finance through the persons accounts.

This is designed to show a basic sitee, where a user can view their Monzo transactions through a sankey diagram.

# Base Requirements

small Monzo application that will show all incoming payers to NET and then brach out to categories and payees

## Must Have

- [ ]  Options to omit catagories from the diagram
- [ ]  Date range filters
- [ ]  Top 10/20/50/All Payees (group everything else as ”Other”)
- [x]  Simple React/Firebase application
- [ ]  Option to use “Exclude from Spending Summary” in filters

## Nice to Have

- [ ]  Open banking
- [ ]  Custom Queries

# Architecture

Very simple application, React based web application using tailwind CSS, a cloud function will assist in exchanging the authentication token from Monzo so there are no client secrets in the browser. using a basic react router.

Otherwise the project is to be hosted on Firebase

# Technologies Used

## Visual Libraries

[Tailwind CSS Components - Tailwind UI](https://tailwindui.com/components)

[Headless UI](https://headlessui.com/)

[Tailwind CSS - Rapidly build modern websites without ever leaving your HTML.](https://tailwindcss.com/)

## Functionality

[How to build a Sankey Diagram with React and D3.](https://www.react-graph-gallery.com/sankey-diagram)

[Home v6.21.3](https://reactrouter.com/en/main)

[useFetch (use-http)](https://use-http.com/#/)

[Monzo API Reference](https://docs.monzo.com/#introduction)

[Dexie.js - Minimalistic IndexedDB Wrapper](https://dexie.org/)

## Backend

[Firebase | Google’s Mobile and Web App Development Platform](https://firebase.google.com/)

[Cloud Functions | Google Cloud](https://cloud.google.com/functions)

# Basic UI Screens

# Progress Update

February 4, 2024 Progress is good, working through, got the chart working, and monzo auth working, tried using RxDB but dependancies are all over the place and incompatible with the rest of `react-scripts` Issue currently is having the ability to apply filtering, since with no filtering the chart is full of shite