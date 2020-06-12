package org.openforis.sepal.component.user.adapter

import groovy.json.JsonOutput
import org.openforis.sepal.user.GoogleTokens
import org.openforis.sepal.util.Terminal
import org.slf4j.Logger
import org.slf4j.LoggerFactory

import java.nio.file.Files
import java.nio.file.LinkOption
import java.nio.file.Path

class GoogleAccessTokenFileGateway {
    private Logger LOG = LoggerFactory.getLogger(GoogleAccessTokenFileGateway)
    private final String homeDirectory

    GoogleAccessTokenFileGateway(String homeDirectory) {
        this.homeDirectory = homeDirectory
    }

    void save(String username, GoogleTokens tokens) {
        if (!tokens)org.openforis.sepal.component.user.adapter.GoogleAccessTokenFileGateway {
            delete(username)
            return
        }
        def file = credentialsFile(username)
        def lockFile = new File('.lock', file.parentFile)
        if (!lockFile.exists())
            lockFile.createNewFile()
        if (!file.exists()) {
            file.parentFile.mkdirs()
            file.createNewFile()
        }
        file.write(JsonOutput.toJson([
                access_token            : tokens.accessToken,
                access_token_expiry_date: tokens.accessTokenExpiryDate
        ]))
        def gid = Files.getAttribute(Path.of(homeDirectory, username), 'unix:gid', LinkOption.NOFOLLOW_LINKS);
        Terminal.execute(file.parentFile.parentFile, 'sudo', 'chown', '-R', "root:$gid", '.')
        Terminal.execute(file.parentFile.parentFile, 'sudo', 'chmod', "1775", '.')
        Terminal.execute(file.parentFile, 'sudo', 'chmod', "1775", '.')
    }

    void delete(String username) {
        credentialsFile(username).delete()
    }

    private File credentialsFile(String username) {
        new File("$homeDirectory/$username/.config/earthengine/", 'credentials')
    }

}
