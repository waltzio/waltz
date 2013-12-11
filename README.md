[![Build Status](https://travis-ci.org/waltzio/waltz.png)](https://travis-ci.org/waltzio/waltz)

# Waltz
An open source password manager designed to work with Clef

## Contributing a site configuration to Waltz

Waltz recognizes sites by using the configuration files found in
`site_configs`.

To make a site work with Waltz, add a `json` file to the `site_configs`
directory. Please name the file with the domain you
are trying to add. 

Please also add a 150x150 `png` with the site logo in `static/img/site_images`
using the same name as the config file.

### Required fields

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

#### `*//*.localhost/*`

The site's domain specified as a [match
pattern](http://developer.chrome.com/extensions/match_patterns.html). Waltz
will run on any page that matches this pattern. For example, Waltz will be run
on `https://localhost/hello` and `http://sub.localhost/`.

#### name

A human readable name. This is displayed in messages to the user.

#### logout

Configuration related to logging out. 

##### `cookies`

A list of cookies. Waltz will delete these cookies when a user logs out on
their phone via Clef. 

#### login

Configuration related to logging in.

##### `urls`

A list of URLs that contain the site's login form. These are used to get hidden
input fields, among other things.

##### `formURL`

The `action` URL for the login form. The username and password are usually
POSTed to this URL. 

##### `method`

The `method` of the login form, usually "POST".

##### `usernameField`

The `name` attribute of the `input` where you put your username.

##### `passwordField`

The `name` attribute of the `input` where you put your password.

##### `check`

A jQuery [selector](http://api.jquery.com/category/selectors/) for an element that *only*
appears on a page you had to log in for. The best element to select for is the
logout button or link.

### Optional fields

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

### login

These optional fields are all in the `login` section of the config file.

##### `hasHiddenInputs`

Specify `true` if the login form has hidden inputs. If `hasHiddenInputs` is
`true`, Waltz will request the login page in the background, (using one of the URLs in
`login.urls`) find all the hidden inputs, and submit them with the decrypted
username and password.

##### `submitButtonValue`

The `value` attribute of the submit input. This is needed in rare cases to
differentiate between the login form and other forms on the login page when the
username and password fields have the same name.(see `site_config/hackernews.json`)

##### `twoFactor`

A list of URLs that the user might be redirected to when they have two-factor
authentication enabled. 

After logging a user in, Waltz automatically redirects the user to the page 
they were on when they clicked the Waltz icon. Explicitly specifying two-factor
URLs ensures that Waltz will not forcefully redirect the user away from the 
two-factor page.

##### `exclude`

These config options relate to whether Waltz will forcefully redirect the user
back to a certain page or let the site handle the redirect itself.

###### `forcedRedirectURLs`

A list of URLs. If the user clicks the Waltz icon on any of these pages, Waltz
will *not* redirect them back to this page, instead letting the page handle
the redirect. 

###### `nextURLs`

A list of URLs. If this user is redirected naturally to any of these URLs,
Waltz will not attempt to redirect them back to the page on which they clicked
the Waltz icon. 

It's useful to specify captcha URLs or error URLs here. Also, Waltz does not
redirect the user away from login URLs if they are naturally redirected
back to any of them after submitting their credentials. Waltz assumes that if
a user is redirected back to a login page, that there was an error submitting
the form.

##### `formOnly`

If the login form generates inputs using JavaScript, Waltz isn't able to submit
the login form when not on the page, even if it is loaded in the background.

If this is the case, you can specify `"formOnly": true` to only show Waltz if
the user is on one of the `login.urls`.
