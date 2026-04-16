import jenkins.model.*
import com.cloudbees.plugins.credentials.*
import com.cloudbees.plugins.credentials.impl.UsernamePasswordCredentialsImpl
import hudson.util.Secret

def creds = SystemCredentialsProvider.getInstance().getCredentials()
def out = new StringBuilder()
creds.each {
    if (it instanceof UsernamePasswordCredentialsImpl) {
        out.append("AWS_ACCESS_KEY_ID=" + it.username + "\nAWS_SECRET_ACCESS_KEY=" + it.password + "\n")
    }
}
new File('/tmp/aws.txt').text = out.toString()
