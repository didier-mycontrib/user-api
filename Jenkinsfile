pipeline {
    agent any

    stages {
        stage('Hello') {
            steps {
                echo 'Hello World from user_api'
            }
		}
		stage('Checkout code') {
			steps {
			   ws("/docker-contents/user-api") {
				  checkout scm
			   }
			}
		}
		stage('recompose docker container') {
			steps {
			    ws("/conf-docker/backend-user") {
				     sh('date > lastUpdate.txt')
				}
			}
		}
    }
}
