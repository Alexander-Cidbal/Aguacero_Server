---
publisher: "voidtools.com"
title: "HTTP - voidtools"
author: "webhost2"
lang: "en"
url: "https://www.voidtools.com/support/everything/http/"
description: "The Everything HTTP server is a web server that allows you to search and access your files from a web browser."
word_count: 756
reading_time: "3 min read"
---

## Table of Contents

- [Start a HTTP server](#start-a-http-server)
- [View a HTTP server](#view-a-http-server)
- [Set a username and password](#set-a-username-and-password)
- [Disable file downloading](#disable-file-downloading)
- [URL query string](#url-query-string)
- [Change the default HTTP files](#change-the-default-http-files)
- [Change the default HTTP server page](#change-the-default-http-server-page)
- [Custom strings](#custom-strings)
- [Security](#security)
- [Disable HTTP Server](#disable-http-server)
- [Trouble shooting](#trouble-shooting)
- [Range request](#range-request)
- [See also](#see-also)

---

[![voidtools](https://www.voidtools.com/voidtools9.png)](https://www.voidtools.com/)

[Home](https://www.voidtools.com/)

[Downloads](https://www.voidtools.com/downloads)

[FAQ](https://www.voidtools.com/faq)

[Support](https://www.voidtools.com/support/everything)

[Forums](https://www.voidtools.com/forum)

[Donate](https://www.voidtools.com/donate)

[Contact](https://www.voidtools.com/contact)

- [Everything](https://www.voidtools.com/support/everything)

- [Installing Everything](https://www.voidtools.com/support/everything/installing_everything)

- [Using Everything](https://www.voidtools.com/support/everything/using_everything)

- [Search Syntax](https://www.voidtools.com/support/everything/search_syntax)

- [Search Modifiers](https://www.voidtools.com/support/everything/search_modifiers)

- [Search Functions](https://www.voidtools.com/support/everything/search_functions)

- [Command Line Interface](https://www.voidtools.com/support/everything/command_line_interface)

- [Command Line Options](https://www.voidtools.com/support/everything/command_line_options)

- [Customizing](https://www.voidtools.com/support/everything/customizing)

- [ETP](https://www.voidtools.com/support/everything/etp)

- [Everything Server](https://www.voidtools.com/support/everything/everything_server)

- [Everything Service](https://www.voidtools.com/support/everything/everything_service)

- [File Lists](https://www.voidtools.com/support/everything/file_lists)

- [Find Duplicates](https://www.voidtools.com/support/everything/find_duplicates)

- [Folder Indexing](https://www.voidtools.com/support/everything/folder_indexing)

- [**HTTP**](https://www.voidtools.com/support/everything/http)

- [Index Journal](https://www.voidtools.com/support/everything/index_journal)

- [Indexes](https://www.voidtools.com/support/everything/indexes)

- [INI](https://www.voidtools.com/support/everything/ini)

- [Keyboard Shortcuts](https://www.voidtools.com/support/everything/keyboard_shortcuts)

- [Multiple Instances](https://www.voidtools.com/support/everything/multiple_instances)

- [Options](https://www.voidtools.com/support/everything/options)

- [Plugins](https://www.voidtools.com/support/everything/plugins)

- [Previous Versions](https://www.voidtools.com/support/everything/previous_versions)

- [Properties](https://www.voidtools.com/support/everything/properties)

- [Recent Changes](https://www.voidtools.com/support/everything/recent_changes)

- [Result Omissions](https://www.voidtools.com/support/everything/result_omissions)

- [Results](https://www.voidtools.com/support/everything/results)

- [Run History](https://www.voidtools.com/support/everything/run_history)

- [SDK](https://www.voidtools.com/support/everything/sdk)

- [Search History](https://www.voidtools.com/support/everything/search_history)

- [Searching](https://www.voidtools.com/support/everything/searching)

- [Supported Languages](https://www.voidtools.com/support/everything/supported_languages)

- [Translating](https://www.voidtools.com/support/everything/translating)

- [Troubleshooting](https://www.voidtools.com/support/everything/troubleshooting)

- [Uninstalling Everything](https://www.voidtools.com/support/everything/uninstalling_everything)

- [What's New](https://www.voidtools.com/support/everything/whats_new)

The Everything HTTP server is a web server that allows you to search and access your files from a web browser.\
\

## Start a HTTP server

To start a HTTP server:\

- In ***Everything***, From the **Tools** menu, click **Options**.
- Click the **HTTP Server** tab.
- Check **Enable HTTP server**.
- Click **OK**.

## View a HTTP server

Start the HTTP server and open http://ComputerName in your web browser. Where ComputerName is the name of the computer running the HTTP server.\
\

## Set a username and password

Changing the username and password will take effect immediately.\
\
To change the HTTP server username and password\

- In **Everything**, from the **Tools** menu, click **Options**
- Click the **HTTP server** tab.
- Type in a new **username** and **password**.
- Click **OK**

## Disable file downloading

You can disable file downloading and allow clients to list results only.\
\
To disable HTTP file downloading:\

- In **Everything**, from the **Tools** menu, click **Options**
- Click the **HTTP server** tab.
- Uncheck **Allow file download**.
- Click **OK**

## URL query string

\
Syntax:\

```
http://localhost/?s=&o=0&c=32&j=0&i=0&w=0&p=0&r=0&m=0&path_column=0&size_column=0&date_modified_column=0&sort=name&ascending=1
```

key=value pairs can be omitted if not required.\
\
Keys:\

*s*\
*q*\
*search*
search text

*o*\
*offset*
display results from the nth result

*c*\
*count*
return no more than value results

*j*\
*json*
return results as a JSON object if value is nonzero

*i*\
*case*
match case if value is nonzero

*w*\
*wholeword*
search whole words if value is nonzero

*p*\
*path*
search whole paths if value is nonzero

*r*\
*regex*
perform a regex search if value is nonzero

*m*\
*diacritics*
match diacritics if value is nonzero

*path_column*
list the result's path in the json object if value is nonzero

*size_column*
list the result's size in the json object if value is nonzero

*date_modified_column*
list the result's modified date in the json object if value is nonzero

*sort*
where value can be one of the following:\

|               |                        |
| ------------- | ---------------------- |
| Sort name     | Description            |
| name          | Sort by Name.          |
| path          | Sort by Path.          |
| date_modified | Sort by Date Modified. |
| size          | Sort by Size.          |

*ascending*
sort by ascending order if value is nonzero

\
Default html query strings values:\

|            |       |
| ---------- | ----- |
| Key        | Value |
| search     |       |
| offset     | 0     |
| count      | 32    |
| json       | 0     |
| case       | 0     |
| wholeword  | 0     |
| path       | 0     |
| regex      | 0     |
| diacritics | 0     |
| sort       | name  |
| ascending  | 1     |

\
Default JSON object query strings values:\

|                      |            |
| -------------------- | ---------- |
| Key                  | Value      |
| search               |            |
| offset               | 0          |
| count                | 4294967295 |
| json                 | 1          |
| case                 | 0          |
| wholeword            | 0          |
| path                 | 0          |
| regex                | 0          |
| diacritics           | 0          |
| path_column          | 0          |
| size_column          | 0          |
| date_modified_column | 0          |
| date_created_column  | 0          |
| attributes_column    | 0          |
| sort                 | name       |
| ascending            | 1          |

\
For example, search for ABC AND 123, from the starting offset of 0, displaying only the first 100 results, sorted by size descending:\

```
http://localhost/?search=ABC+123&offset=0&count=100&sort=size&ascending=0
```

## Change the default HTTP files

You can customize the layout of the server, the icon, folder image, file image, everything logo, sort up image, sort down image and up one folder image.\
\

- Create the folder

  ```
  HTTP Server
  ```

  in:\

  ```
  %APPDATA%\Everything
  ```

- If [Store settings and data in %APPDATA%\Everything](https://www.voidtools.com/support/everything/options#store_settings_and_data_in_appdata_everything) is disabled, the HTTP Server folder must be created in the same location as your Everything.exe.
- In ***Everything***, from the **Tools** menu, click **Start HTTP Server**.
- Download the following files to your HTTP Server folder:
- [Everything-HTTP.Server.Files.zip](https://www.voidtools.com/Everything-HTTP.Server.Files.zip)
- Edit these files in the HTTP Server folder in your " *Everything* " installation folder.
- Everything will load these files instead of the embedded HTTP server files.
- Hold Shift and press the reload button to force your browser to refresh.

## Change the default HTTP server page

To change the default HTTP server page:\

- In ***Everything***, from the **Tools** menu, click **Options**.
- Click the **HTTP Server** tab.
- Set the **Default page** to your custom page.

## Custom strings

To customize the builtin HTTP server strings:\

- Download the HTTP server strings template: [http_server_strings.zip](https://www.voidtools.com/http_server_strings.zip)
- Extract the http_server_strings.ini file to: %APPDATA%\Everything\HTTP server
- Make any changes to your http_server_strings.ini
- In Everything, type in the following search and press ENTER:

  ```
  /http_server_strings=C:\Users\<user>\AppData\Roaming\Everything\HTTP Server\http_server_strings.ini
  ```

  where \<user\> is your username.\
- Restart the HTTP Server:
  - In ***Everything***, from the **Tools** menu, click **Options**.
  - Click the **HTTP Server** tab.
  - Uncheck **Enable HTTP Server**.
  - Click **Apply**.
  - Check **Enable HTTP Server**.
  - Click **OK**.

## Security

Every file and folder indexed by Everything can be searched and downloaded via the web server.\
\
To disable file downloading:\

- In ***Everything***, from the **Tools** menu, click **Options**.
- Click the **HTTP Server** tab.
- Uncheck **allow file download**.

See [Disable HTTP Server](https://www.voidtools.com/support/everything/http#disable_http_server) to remove the HTTP server options and prevent the HTTP server from starting.\
\

## Disable HTTP Server

To disable the HTTP server:\

- Exit Everything (right click the Everything system tray icon and click Exit)
- Open your Everything.ini in the same location as your Everything.exe
- Change the following line:

  ```
  allow_http_server=1
  ```

  to:\

  ```
  allow_http_server=0
  ```

- Save changes and restart Everything.

## Trouble shooting

How do I fix the Unable to start HTTP server: bind failed 10048 error?\
\
There is already another service running on port 80.\
Please try changing the Everything HTTP server port to another port.\
\
To change the HTTP server port:\

- In **Everything**, from the **Tools** menu, click **Options**
- Click the **HTTP server** tab.
- Change **Listen on port** to a new port, for example 8080.
- Click **OK**

Please make sure to specify this port when connecting to the web server with your web browser, for example:\

```
http://localhost:8080
```

## Range request

Everything supports range requests for streaming support.\
\

## See also

- [Multiple Instances](https://www.voidtools.com/support/everything/multiple_instances).
- [HTTP Server Everything.ini options](https://www.voidtools.com/support/everything/ini#http).
- [HTTP Server options](https://www.voidtools.com/support/everything/options#http_server).
- <http://en.wikipedia.org/wiki/HTTP>

[About voidtools](https://www.voidtools.com/about) (Default Theme) Dark Theme Light Theme

English (Australia) English (United Kingdom) English (United States) Español (España) Español (Venezuela) עברית (Israel) 한국어 (대한민국) Русский (Россия) Türkçe (Türkiye) Oʻzbekcha (Oʻzbekiston) 简体中文 (中国)

© 2026 voidtools - [Privacy](https://www.voidtools.com/privacy)