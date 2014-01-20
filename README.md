[![Build Status](https://travis-ci.org/waltzio/waltz.png)](https://travis-ci.org/waltzio/waltz)

# Waltz
An open source password manager designed to work with [Clef](https://getclef.com/).

## Contributing To Waltz

Waltz is open source! You can contribute by adding sites, submitting issues, fixing bugs,
auditing code, and implementing features.

### Setting up

1. [Download](http://nodejs.org/download/) and install node and npm: 

    	$ brew install node

2. Fork the Waltz repo and run: 

	    $ git clone git@github.com:YOUR-USERNAME/waltz.git
	    $ cd waltz
	    $ npm install
	    $ git checkout -b YOUR-BRANCH-NAME
	    
	Branches should be made from the `develop` branch.

3. Running `npm install` will install [grunt](http://gruntjs.com/), which Waltz uses to build site configuration settings and compile sass. First, build the site configuration: 

		$ grunt build-config
		Running "build-config:go" (build-config) task

		Done, without errors.

4. Then, have grunt watch your files. This will compile site configs and scss when the
   files are saved:

	    $ grunt
	    Running "watch" task
	    Waiting...

5. Finally, you can test your changes by loading Waltz as an unpacked extension in chrome. Make sure the app
   store version of Waltz has been uninstalled to prevent conflicts.

    * Navigate to [chrome://extensions](chrome://extensions/) in your Chrome browser
    * Check the "Developer mode" box 
    * Click "Load unpacked extension..."
    * Navigate to the Waltz root directory and select it

When you are done making changes, please submit a pull request and
the Waltz core team will look it over.

If possible, please write tests for the code you write. 

The PR should be ready to merge your branch into the `develop` branch and all tests should pass. 

### Contributing a site configuration

Waltz recognizes sites by using the configuration files found in
`site_configs`.

To make a site work with Waltz, add a `json` file to the `site_configs`
directory. Please name the file with a key that identifies the domain you
are trying to add (google.com -> `google.json`, facebook.com -> `facebook.json`, news.ycombinator.com -> `hackernews.json`). 

Please also add a 150x150 `png` with the site logo in `static/img/site_images`
using the same name as the config file.

#### Required fields

For many sites, Waltz only needs a few required configuration options to work. 

As a quick example, here is `site_configs/localhost.json`:

    {
        "*://*.localhost/*": {
            "name": "localhost",
            "logout": {
                "cookies": ["PHPSESSID"]
            },
            "login": {
                "urls": ["http://localhost/"],
                "formURL": "http://localhost/submitLogin",
                "method": "POST",
                "usernameField": "username",
                "passwordField": "password",
                "check": "#logged_in"
            }
        }
    }

Let's step through each section. 

- `*//*.localhost/*` *object* - the site's domain specified as a [match
pattern](http://developer.chrome.com/extensions/match_patterns.html). Waltz
will run on any page that matches this pattern. For example, Waltz will be run
on `https://localhost/hello` and `http://sub.localhost/`.

    - `name` *string* — a human readable name. This is displayed in messages to the user.
    
    
    - `logout` *object* — configuration related to logging out. 
    
        - `cookies` *list (of strings)* — a list of cookie names. Waltz will delete these cookies when a user logs out on
    their phone via Clef. 
    
    -  `login` *object* — configuration related to logging in.
    
        - `urls` *list (of strings)* — a list of URLs that contain the site's login form. These are used to get hidden
    input fields, among other things.
        - `formURL` *string* — the `action` URL for the login form. The username and password are POSTed to this URL. 
        - `method` *string* — the `method` of the login form, usually "POST".
        - `usernameField` *string* — the `name` attribute of the `input` where you put your username.
        - `passwordField` *string* — the `name` attribute of the `input` where you put your password.
        - `check` *string* — a  [jQuery selector](http://api.jquery.com/category/selectors/) for an element that *only*
    appears on a page you had to log in for. The best element to select for is the logout button or link.

*Note:* Determining the cookie that stores whether a user is logged in is
a process of trial and error. Typically, the cookie can be found by logging
into a website, opening up the Chrome developer console, deleting cookies
and refreshing the page. If, when you have refreshed the page, you are logged
out, then you've found the right cookie to add to the `logout.cookies` list.

#### Optional fields

In some cases, Waltz needs a little more information to work properly on more
complicated sites. For instance, a site might have hidden inputs, two
factor authentication, or might generate inputs with JavaScript.

Waltz has optional configs to handle some of these things as generally as
possible. If we've left anything out, please open a pull request and add the
config you need, or let us know in the issues.

Here is an example config that has *only* optional fields:

    {
        "*://*.example.com/*": { 
            "name": "Example.com",
            "login": {
                "hasHiddenInputs": true,
                "submitButtonValue": "login",
                "twoFactor": [
                    {
                        "url": "https://www.example.com/checkpoint/twoFactor",
                        "check": "input[name]='twoFactor_code'"
                    }     
                ],
                "exclude": {
                    "forcedRedirectURLs" : ["https://about.example.com/download"],
                    "nextURLs": ["https://example.com/login/captcha", "https://example.com/login/error"]
                },
                "formOnly": false
            }
        }
    }


- `*://*.example.com/*` *object* 
    - `login` *object*
    
        - `hasHiddenInputs` *boolean* — specify `true` if the login form has hidden inputs. If `hasHiddenInputs` is
    `true`, Waltz will request the login page in the background, (using the first URL in
    `login.urls`) find all the hidden inputs, and submit them with the decrypted
    username and password.
        - `submitButton` *string* — A [jQuery selector](http://api.jquery.com/category/selectors/) for the submit input in the login form. This is needed in rare cases to differentiate between the login form and other forms on the login page when the
    username and password fields have the same name (see [`site_config/hackernews.json`](https://github.com/waltzio/waltz/blob/develop/site_configs/hackernews.json)).
        - `twoFactor` *list (of strings)*— a list of URLs that the user might be redirected to when they have two-factor
    authentication enabled. After logging a user in, Waltz automatically redirects the user to the page 
    they were on when they clicked the Waltz icon. Explicitly specifying two-factor
    URLs ensures that Waltz will not forcefully redirect the user away from the 
    two-factor page.
        - `exclude` *object* — these config options relate to whether Waltz will forcefully redirect the user
    back to a certain page or let the site handle the redirect itself.
            - `forcedRedirectURLs` *list (of strings)* — a list of URLs. If the user clicks the Waltz icon on any of these pages, Waltz
    will *not* redirect them back to this page, instead letting the page handle
    the redirect. 
            - `nextURLs` *list (of strings)* — A list of URLs. If this user is redirected naturally to any of these URLs,
    Waltz will not attempt to redirect them back to the page on which they clicked
    the Waltz icon.  It's useful to specify captcha URLs or error URLs here. Also, Waltz does not
    redirect the user away from login URLs if they are naturally redirected
    back to any of them after submitting their credentials. Waltz assumes that if
    a user is redirected back to a login page, that there was an error submitting
    the form.
        - `formOnly` *boolean* — if the login form generates inputs using JavaScript, Waltz isn't able to submit
    the login form when not on the page, even if it is loaded in the background (see [`google.json`](https://github.com/waltzio/waltz/blob/develop/site_configs/google.json). If this is the case, you can specify `"formOnly": true` to only show Waltz if
    the user is on one of the `login.urls`.
